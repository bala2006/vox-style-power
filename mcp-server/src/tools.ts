import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as eleven from "./elevenlabs.js";
import {
  addAsset,
  buildTimeline,
  exists,
  lintProject,
  listAssets,
  listProjects,
  loadProject,
  mp3DurationSeconds,
  OUTPUT_ROOT,
  paths,
  readBlockMeta,
  saveProject,
  textHash,
  voiceKey,
  writeAssetBuffer,
  type BlockAudioMeta,
} from "./projects.js";
import { getJob, listJobs, renderBlockStill, startRender, type RenderJob } from "./render.js";
import { ProjectSchema, SCENE_TYPES, type Project } from "./shared/schema.js";

const GUIDES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "guides");
const LONG_BLOCK_SECONDS = 9.5;

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
type Result = { content: Content[]; isError?: boolean };

const text = (value: unknown): Content => ({
  type: "text",
  text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
});

/** Turn thrown errors into tool errors the model can read and act on. */
function safe<A>(fn: (args: A, extra: any) => Promise<Result>) {
  return async (args: A, extra: any): Promise<Result> => {
    try {
      return await fn(args, extra);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [text(`Error: ${message}`)], isError: true };
    }
  };
}

async function readGuide(name: "workflow" | "style-newsroom") {
  return fs.readFile(path.join(GUIDES, `${name}.md`), "utf8");
}

function sceneTypeCatalog() {
  return SCENE_TYPES.map((s) => {
    const schema = z.toJSONSchema(s, { io: "input" }) as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, { const?: string }>;
    return { type: props.type?.const, description: s.description, schema };
  });
}

function resolveVoiceId(project: Project): string {
  const id = project.voice.voice_id ?? process.env.VOX_VOICE_ID?.trim();
  if (!id) {
    throw new Error(
      "No voice selected. Call vox_list_voices, set project.voice.voice_id with vox_save_project, or set VOX_VOICE_ID in the server env.",
    );
  }
  return id;
}

function jobView(job: RenderJob) {
  return {
    job_id: job.id,
    status: job.status,
    progress: Math.round(job.progress * 100) + "%",
    aspect: job.aspect,
    output: job.output,
    duration_seconds: job.durationSeconds ? Number(job.durationSeconds.toFixed(2)) : undefined,
    elapsed_seconds: Math.round(((job.finishedAt ?? Date.now()) - job.startedAt) / 1000),
    silent_blocks: job.silentBlocks.length ? job.silentBlocks : undefined,
    error: job.error,
  };
}

async function waitForJob(job: RenderJob, seconds: number, extra: any) {
  const token = extra?._meta?.progressToken;
  const deadline = Date.now() + seconds * 1000;
  while (job.status !== "done" && job.status !== "failed" && Date.now() < deadline) {
    await Promise.race([job.promise, new Promise((r) => setTimeout(r, 2000))]);
    if (token !== undefined) {
      await extra
        .sendNotification({
          method: "notifications/progress",
          params: { progressToken: token, progress: Math.round(job.progress * 100), total: 100, message: `Rendering ${job.slug}` },
        })
        .catch(() => undefined);
    }
  }
}

const slugArg = z.string().describe("Project slug passed to vox_save_project.");

export function registerTools(server: McpServer) {
  // ───────────────────────────── Skills: guides, prompt, resources ─────────────────────────────

  server.registerResource(
    "workflow",
    "vox://guide/workflow",
    { title: "Vox explainer workflow", description: "The end-to-end method: brief, research, script, storyboard, gate, build.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: await readGuide("workflow") }] }),
  );
  server.registerResource(
    "style-newsroom",
    "vox://guide/style/newsroom",
    { title: "Newsroom house style", description: "Palette, type, motion vocabulary and how to write for each template.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: await readGuide("style-newsroom") }] }),
  );
  server.registerResource(
    "scene-types",
    "vox://scene-types",
    { title: "Scene templates", description: "JSON Schema for every scene template.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(sceneTypeCatalog(), null, 2) }] }),
  );

  server.registerPrompt(
    "vox_explainer",
    {
      title: "Make a Vox-style explainer",
      description: "Loads the workflow and house style and starts a run on a topic, URL or trend.",
      argsSchema: {
        topic: z.string().optional().describe("Topic, article URL, or trending term. Leave empty to have one found."),
      },
    },
    async ({ topic }) => {
      const [workflow, style] = await Promise.all([readGuide("workflow"), readGuide("style-newsroom")]);
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `${workflow}\n\n---\n\n${style}\n\n---\n\n` +
                (topic ? `Start the brief. The user's topic is: ${topic}` : "Start the brief. The user has not given a topic yet."),
            },
          },
        ],
      };
    },
  );

  // ───────────────────────────── Script tools ─────────────────────────────

  server.registerTool(
    "vox_get_guide",
    {
      title: "Get the Vox workflow guide",
      description:
        "Returns the Vox explainer method (brief, research, script rules, storyboard rules, the single approval gate, build steps) " +
        "and the house style. Call this first, before writing a script.",
      inputSchema: { section: z.enum(["all", "workflow", "style"]).default("all") },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ section }: { section: "all" | "workflow" | "style" }) => {
      const parts: string[] = [];
      if (section !== "style") parts.push(await readGuide("workflow"));
      if (section !== "workflow") parts.push(await readGuide("style-newsroom"));
      return { content: [text(parts.join("\n\n---\n\n"))] };
    }),
  );

  server.registerTool(
    "vox_list_scene_types",
    {
      title: "List scene templates",
      description: "Every coded scene template with its description and JSON Schema. Use it to fill `scene` in each block.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => ({ content: [text(sceneTypeCatalog())] })),
  );

  server.registerTool(
    "vox_save_project",
    {
      title: "Save project storyboard",
      description:
        "Create or replace a project: title, aspect, voice settings, sources and the ordered blocks (narration + scene). " +
        "Validates against the scene schemas and returns house-rule warnings to fix before the approval gate. " +
        "Changing a block's narration marks its audio stale; vox_synthesize_narration will redo only those blocks.",
      inputSchema: { project: ProjectSchema.describe("Full project. See vox_list_scene_types for scene fields.") },
      annotations: { idempotentHint: true },
    },
    safe(async ({ project }: { project: unknown }) => {
      const { project: saved, warnings } = await saveProject(project as never);
      return {
        content: [
          text({
            saved: paths.project(saved.slug),
            slug: saved.slug,
            blocks: saved.blocks.length,
            warnings,
            next: warnings.length ? "Fix the warnings and save again." : "Preview blocks with vox_render_preview, then vox_plan_timing for the gate.",
          }),
        ],
      };
    }),
  );

  server.registerTool(
    "vox_get_project",
    {
      title: "Get project",
      description: "Return a saved project's storyboard, its assets, and which blocks have narration.",
      inputSchema: { slug: slugArg },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ slug }: { slug: string }) => {
      const project = await loadProject(slug);
      const narration = await Promise.all(
        project.blocks.map(async (b, i) => {
          const meta = await readBlockMeta(slug, i);
          return { block: i + 1, status: !meta ? "missing" : meta.narration === b.narration ? "ready" : "stale", seconds: meta?.audio_seconds };
        }),
      );
      return { content: [text({ project, assets: await listAssets(slug), narration, folder: path.dirname(paths.project(slug)) })] };
    }),
  );

  server.registerTool(
    "vox_list_projects",
    {
      title: "List projects",
      description: `List saved projects in the output folder (${OUTPUT_ROOT}).`,
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => ({ content: [text({ output_root: OUTPUT_ROOT, projects: await listProjects() })] })),
  );

  server.registerTool(
    "vox_add_asset",
    {
      title: "Add image or audio asset",
      description:
        "Copy an image (png, jpg, webp, gif, svg) or audio file (mp3, wav, m4a, aac, ogg) into the project from an http(s) URL or a local path. " +
        "Returns the asset name to use in an `image` scene or as `music.asset`. Only add files you have the right to use.",
      inputSchema: {
        slug: slugArg,
        source: z.string().min(1).max(2000).describe("http(s) URL or absolute local file path."),
        name: z.string().max(100).optional().describe("Optional file name to store it under."),
      },
    },
    safe(async ({ slug, source, name }: { slug: string; source: string; name?: string }) => {
      const res = await addAsset(slug, source, name);
      return { content: [text({ asset: res.name, bytes: res.bytes, assets: await listAssets(slug) })] };
    }),
  );

  server.registerTool(
    "vox_plan_timing",
    {
      title: "Plan timing and estimate cost",
      description:
        "Per-block durations, total runtime, the ElevenLabs characters still to synthesize, the account's remaining quota (if a key is set), " +
        "and house-rule warnings. Use this output at the approval gate. Before narration exists, durations are estimated from word count.",
      inputSchema: { slug: slugArg },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ slug }: { slug: string }) => {
      const project = await loadProject(slug);
      const built = await buildTimeline(project, null);
      const voiceId = project.voice.voice_id ?? process.env.VOX_VOICE_ID?.trim();
      let charsToSynthesize = 0;
      const blocks = await Promise.all(
        project.blocks.map(async (b, i) => {
          const meta = await readBlockMeta(slug, i);
          const t = built.timeline[i];
          const fresh = meta && voiceId && meta.text_hash === textHash(b.narration, voiceKey(project, voiceId));
          if (!fresh) charsToSynthesize += b.narration.length;
          return {
            block: i + 1,
            scene: b.scene.type,
            words: b.narration.split(/\s+/).filter(Boolean).length,
            seconds: Number((t.durationFrames / project.fps).toFixed(2)),
            timing: meta && meta.narration === b.narration ? "measured" : "estimated",
          };
        }),
      );
      let quota: unknown = "ELEVENLABS_API_KEY not set";
      if (eleven.hasApiKey()) {
        try {
          const sub = await eleven.getSubscription();
          quota = {
            tier: sub.tier,
            characters_used: sub.character_count,
            character_limit: sub.character_limit,
            characters_remaining:
              sub.character_limit !== undefined && sub.character_count !== undefined ? sub.character_limit - sub.character_count : undefined,
          };
        } catch (err) {
          quota = `unavailable: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      return {
        content: [
          text({
            title: project.title,
            aspect: project.aspect,
            total_seconds: Number((built.totalFrames / project.fps).toFixed(2)),
            blocks,
            elevenlabs: {
              voice_id: voiceId ?? "not set",
              model_id: project.voice.model_id ?? eleven.DEFAULT_TTS_MODEL,
              characters_to_synthesize: charsToSynthesize,
              note: "ElevenLabs bills text-to-speech by character; the exact rate depends on the model and plan.",
              quota,
            },
            music: project.music ? project.music.asset : "none",
            render_cost: "Local CPU only, no credits.",
            warnings: await lintProject(project),
          }),
        ],
      };
    }),
  );

  // ───────────────────────────── Voice tools (ElevenLabs) ─────────────────────────────

  server.registerTool(
    "vox_list_voices",
    {
      title: "List ElevenLabs voices",
      description: "Search the ElevenLabs voices available to this account. For the house sound, look for a deep, measured narration or documentary voice.",
      inputSchema: {
        search: z.string().max(100).optional().describe("e.g. 'documentary', 'narration', 'deep'."),
        limit: z.number().int().min(1).max(100).default(30),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    safe(async ({ search, limit }: { search?: string; limit: number }) => {
      const voices = await eleven.listVoices({ search, pageSize: limit });
      return { content: [text({ count: voices.length, voices })] };
    }),
  );

  server.registerTool(
    "vox_synthesize_narration",
    {
      title: "Synthesize narration",
      description:
        "Voice each block with ElevenLabs text-to-speech and store the MP3 plus word-level timestamps, which drive block length and karaoke captions. " +
        "SPENDS ELEVENLABS CREDITS: only call after the user approved the gate. Blocks whose narration and voice settings are unchanged are skipped.",
      inputSchema: {
        slug: slugArg,
        blocks: z.array(z.number().int().min(1)).optional().describe("1-based block numbers. Omit for every block."),
        force: z.boolean().default(false).describe("Re-synthesize even if the audio is up to date."),
      },
      annotations: { openWorldHint: true },
    },
    safe(async ({ slug, blocks, force }: { slug: string; blocks?: number[]; force: boolean }) => {
      const project = await loadProject(slug);
      const voiceId = resolveVoiceId(project);
      const key = voiceKey(project, voiceId);
      const wanted = blocks?.length ? blocks.map((b) => b - 1) : project.blocks.map((_, i) => i);
      for (const i of wanted) if (!project.blocks[i]) throw new Error(`Block ${i + 1} does not exist.`);
      await fs.mkdir(paths.audio(slug), { recursive: true });
      const results: unknown[] = [];
      let characters = 0;
      for (const i of wanted) {
        const b = project.blocks[i];
        const hash = textHash(b.narration, key);
        const prev = await readBlockMeta(slug, i);
        if (!force && prev?.text_hash === hash && (await exists(paths.blockAudio(slug, i)))) {
          results.push({ block: i + 1, status: "unchanged", seconds: prev.audio_seconds });
          continue;
        }
        const r = await eleven.synthesizeWithTimestamps({
          text: b.narration,
          voiceId,
          modelId: project.voice.model_id,
          voiceSettings: {
            stability: project.voice.stability,
            similarity_boost: project.voice.similarity_boost,
            style: project.voice.style,
            speed: project.voice.speed,
          },
          languageCode: project.voice.language_code,
          previousText: project.blocks[i - 1]?.narration,
          nextText: project.blocks[i + 1]?.narration,
        });
        characters += b.narration.length;
        const audioSeconds = mp3DurationSeconds(r.audio) || r.speechEnd;
        const meta: BlockAudioMeta = {
          text_hash: hash,
          narration: b.narration,
          voice_id: voiceId,
          words: r.words,
          speech_end: r.speechEnd,
          audio_seconds: Number(audioSeconds.toFixed(3)),
        };
        await fs.writeFile(paths.blockAudio(slug, i), r.audio);
        await fs.writeFile(paths.blockMeta(slug, i), JSON.stringify(meta, null, 2));
        results.push({
          block: i + 1,
          status: "synthesized",
          seconds: meta.audio_seconds,
          warning: r.speechEnd > LONG_BLOCK_SECONDS ? `Speech runs ${r.speechEnd.toFixed(1)}s; shorten the line to stay under ~${LONG_BLOCK_SECONDS}s.` : undefined,
        });
      }
      const built = await buildTimeline(project, null);
      return {
        content: [
          text({
            voice_id: voiceId,
            characters_billed: characters,
            blocks: results,
            total_seconds: Number((built.totalFrames / project.fps).toFixed(2)),
            next: "Preview a block or two with vox_render_preview to check caption timing, then vox_render_video.",
          }),
        ],
      };
    }),
  );

  server.registerTool(
    "vox_generate_music",
    {
      title: "Generate music bed",
      description:
        "Compose an instrumental bed with ElevenLabs Music, save it as a project asset, and set it as the project's music. " +
        "It is ducked under the narration automatically at render. SPENDS ELEVENLABS CREDITS: only after the gate.",
      inputSchema: {
        slug: slugArg,
        prompt: z
          .string()
          .min(3)
          .max(1000)
          .default("Understated documentary underscore, soft pulsing synth and muted piano, steady 90 bpm, no vocals, no big drops")
          .describe("Describe mood, instruments and tempo. Keep it understated so it sits under a voice."),
        seconds: z.number().min(3).max(600).optional().describe("Length; defaults to the current runtime plus two seconds."),
        volume: z.number().min(0).max(1).default(0.22),
        duck_to: z.number().min(0).max(1).default(0.07),
      },
      annotations: { openWorldHint: true },
    },
    safe(async (args: { slug: string; prompt: string; seconds?: number; volume: number; duck_to: number }) => {
      const project = await loadProject(args.slug);
      const built = await buildTimeline(project, null);
      const seconds = Math.min(Math.max(args.seconds ?? built.totalFrames / project.fps + 2, 3), 600);
      const audio = await eleven.composeMusic({ prompt: args.prompt, lengthMs: Math.round(seconds * 1000) });
      const asset = await writeAssetBuffer(args.slug, "music.mp3", audio);
      const { warnings } = await saveProject({ ...project, music: { asset, volume: args.volume, duck_to: args.duck_to } });
      return { content: [text({ asset, seconds: Number(seconds.toFixed(1)), music: "set on project", warnings })] };
    }),
  );

  // ───────────────────────────── Render tools (Remotion) ─────────────────────────────

  server.registerTool(
    "vox_render_preview",
    {
      title: "Render a preview still",
      description:
        "Render one frame of a block as a JPEG and return it as an image, so you can check layout, overflow and caption placement. " +
        "Free. `at` is the position inside the block: 0.7 shows the scene after its animations have landed.",
      inputSchema: {
        slug: slugArg,
        block: z.number().int().min(1).describe("1-based block number."),
        at: z.number().min(0).max(1).default(0.7),
        aspect: z.enum(["9:16", "16:9", "1:1"]).optional().describe("Override the project aspect for this preview."),
        return_image: z.boolean().default(true).describe("Set false to return only the file path."),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async (args: { slug: string; block: number; at: number; aspect?: Project["aspect"]; return_image: boolean }) => {
      const project = await loadProject(args.slug);
      const { file, image, frame } = await renderBlockStill({ project, block: args.block, at: args.at, aspect: args.aspect });
      const content: Content[] = [text({ file, block: args.block, frame, aspect: args.aspect ?? project.aspect })];
      if (args.return_image) content.push({ type: "image", data: image.toString("base64"), mimeType: "image/jpeg" });
      return { content };
    }),
  );

  server.registerTool(
    "vox_render_video",
    {
      title: "Render the MP4",
      description:
        "Export the finished video with Remotion (H.264 + AAC). Waits up to `wait_seconds`; if the render is still running it returns a job id " +
        "to poll with vox_render_status. Blocks without narration render silent and are listed in `silent_blocks`.",
      inputSchema: {
        slug: slugArg,
        aspects: z
          .array(z.enum(["9:16", "16:9", "1:1"]))
          .min(1)
          .max(3)
          .optional()
          .describe("Defaults to the project aspect. Extra aspects cost only render time."),
        wait_seconds: z.number().min(0).max(1500).default(50),
      },
    },
    safe(async ({ slug, aspects, wait_seconds }: { slug: string; aspects?: Project["aspect"][]; wait_seconds: number }, extra) => {
      const project = await loadProject(slug);
      const list = aspects?.length ? [...new Set(aspects)] : [project.aspect];
      const jobs: RenderJob[] = [];
      for (const a of list) jobs.push(await startRender(project, a));
      const deadline = Date.now() + wait_seconds * 1000;
      for (const j of jobs) await waitForJob(j, Math.max(0, (deadline - Date.now()) / 1000), extra);
      const views = jobs.map(jobView);
      const pending = views.some((v) => v.status === "queued" || v.status === "rendering");
      return {
        content: [text({ jobs: views, next: pending ? "Poll vox_render_status with the job_id until status is done." : undefined })],
        isError: views.every((v) => v.status === "failed") || undefined,
      };
    }),
  );

  server.registerTool(
    "vox_render_status",
    {
      title: "Render status",
      description: "Status of a render job, or of every job in this server session when job_id is omitted. Optionally waits.",
      inputSchema: {
        job_id: z.string().optional(),
        wait_seconds: z.number().min(0).max(1500).default(30),
      },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ job_id, wait_seconds }: { job_id?: string; wait_seconds: number }, extra) => {
      if (!job_id) return { content: [text({ jobs: listJobs().map(jobView) })] };
      const job = getJob(job_id);
      if (!job) throw new Error(`Unknown job "${job_id}". Jobs live only as long as the server process.`);
      await waitForJob(job, wait_seconds, extra);
      return { content: [text(jobView(job))] };
    }),
  );
}
