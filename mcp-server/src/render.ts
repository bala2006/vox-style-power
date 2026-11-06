/**
 * Remotion rendering. The composition is bundled once per server process and
 * reused. Project files (narration, images, music) are served to the headless
 * browser from a loopback-only HTTP server, so a render never has to rebundle.
 */
import { promises as fs, createReadStream } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { ASPECT_SIZES, type Project, type RenderInput } from "./shared/schema.js";
import { buildTimeline, OUTPUT_ROOT, paths, ProjectError } from "./projects.js";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(PKG_ROOT, "src", "remotion", "index.ts");
const COMPOSITION_ID = "Vox";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

let serveUrlPromise: Promise<string> | null = null;
let assetServerPromise: Promise<string> | null = null;

function getServeUrl(): Promise<string> {
  serveUrlPromise ??= (async () => {
    await ensureBrowser();
    return bundle({ entryPoint: ENTRY, enableCaching: true });
  })().catch((err) => {
    serveUrlPromise = null;
    throw err;
  });
  return serveUrlPromise;
}

/** Loopback static server rooted at OUTPUT_ROOT. Only assets/ and audio/ are exposed. */
function getAssetServer(): Promise<string> {
  assetServerPromise ??= new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.writeHead(405).end();
          return;
        }
        const urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
        const parts = urlPath.split("/").filter(Boolean);
        if (parts.length !== 3 || !["assets", "audio"].includes(parts[1]) || parts.some((p) => p.startsWith("."))) {
          res.writeHead(404).end();
          return;
        }
        const file = path.join(OUTPUT_ROOT, ...parts);
        if (!file.startsWith(OUTPUT_ROOT + path.sep)) {
          res.writeHead(403).end();
          return;
        }
        const stat = await fs.stat(file).catch(() => null);
        if (!stat?.isFile()) {
          res.writeHead(404).end();
          return;
        }
        const headers = {
          "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
          "access-control-allow-origin": "*",
          "accept-ranges": "bytes",
          "cache-control": "no-store",
        };
        const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
        if (range && (range[1] || range[2])) {
          const start = range[1] ? Number(range[1]) : Math.max(stat.size - Number(range[2]), 0);
          const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
          if (start > end || start >= stat.size) {
            res.writeHead(416, { "content-range": `bytes */${stat.size}` }).end();
            return;
          }
          res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${stat.size}`, "content-length": end - start + 1 });
          if (req.method === "HEAD") res.end();
          else createReadStream(file, { start, end }).pipe(res);
          return;
        }
        res.writeHead(200, { ...headers, "content-length": stat.size });
        if (req.method === "HEAD") res.end();
        else createReadStream(file).pipe(res);
      } catch {
        res.writeHead(500).end();
      }
    });
    server.on("error", (err) => {
      assetServerPromise = null;
      reject(err);
    });
    server.listen(0, "127.0.0.1", () => {
      server.unref();
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);
    });
  });
  return assetServerPromise;
}

export async function prepareInput(project: Project, aspect?: Project["aspect"]) {
  const base = await getAssetServer();
  const assetBaseUrl = `${base}${project.slug}/`;
  const built = await buildTimeline(project, assetBaseUrl);
  const size = ASPECT_SIZES[aspect ?? project.aspect];
  const input: RenderInput = {
    project: { ...project, aspect: aspect ?? project.aspect },
    timeline: built.timeline,
    assetBaseUrl,
    width: size.width,
    height: size.height,
    totalFrames: built.totalFrames,
  };
  return { input, built };
}

async function composition(input: RenderInput) {
  const serveUrl = await getServeUrl();
  const comp = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps: input as unknown as Record<string, unknown>,
    logLevel: "error",
  });
  return { serveUrl, comp };
}

export async function renderBlockStill(args: {
  project: Project;
  block: number;
  at: number;
  aspect?: Project["aspect"];
  /** Output scale; 0.5 keeps previews small enough to hand back to the model. */
  scale?: number;
}): Promise<{ file: string; image: Buffer; frame: number }> {
  const { input } = await prepareInput(args.project, args.aspect);
  const t = input.timeline[args.block - 1];
  if (!t) throw new ProjectError(`Block ${args.block} does not exist; the project has ${input.timeline.length}.`);
  const frame = t.startFrame + Math.min(Math.round(args.at * (t.durationFrames - 1)), t.durationFrames - 1);
  const { serveUrl, comp } = await composition(input);
  const file = path.join(
    paths.renders(args.project.slug),
    `preview-block-${String(args.block).padStart(2, "0")}-${input.project.aspect.replace(":", "x")}.jpg`,
  );
  await fs.mkdir(path.dirname(file), { recursive: true });
  await renderStill({
    composition: comp,
    serveUrl,
    output: file,
    frame,
    inputProps: input as unknown as Record<string, unknown>,
    imageFormat: "jpeg",
    jpegQuality: 82,
    scale: args.scale ?? 0.5,
    logLevel: "error",
  });
  return { file, image: await fs.readFile(file), frame };
}

export type RenderJob = {
  id: string;
  slug: string;
  aspect: Project["aspect"];
  status: "queued" | "rendering" | "done" | "failed";
  progress: number;
  output: string;
  startedAt: number;
  finishedAt?: number;
  durationSeconds?: number;
  silentBlocks: number[];
  error?: string;
  promise: Promise<void>;
};

const jobs = new Map<string, RenderJob>();
let queue: Promise<void> = Promise.resolve();

export function getJob(id: string) {
  return jobs.get(id);
}

export function listJobs() {
  return [...jobs.values()];
}

/** Renders run one at a time; Remotion already parallelises frames internally. */
export async function startRender(project: Project, aspect: Project["aspect"]): Promise<RenderJob> {
  const { input, built } = await prepareInput(project, aspect);
  const id = `${project.slug}-${aspect.replace(":", "x")}-${Date.now().toString(36)}`;
  const output = path.join(paths.renders(project.slug), `${project.slug}-${aspect.replace(":", "x")}.mp4`);
  const job: RenderJob = {
    id,
    slug: project.slug,
    aspect,
    status: "queued",
    progress: 0,
    output,
    startedAt: Date.now(),
    durationSeconds: built.totalFrames / project.fps,
    silentBlocks: [...built.missingAudio, ...built.staleAudio].sort((a, b) => a - b),
    promise: Promise.resolve(),
  };
  jobs.set(id, job);
  const run = async () => {
    job.status = "rendering";
    try {
      const { serveUrl, comp } = await composition(input);
      await fs.mkdir(path.dirname(output), { recursive: true });
      await renderMedia({
        composition: comp,
        serveUrl,
        codec: "h264",
        outputLocation: output,
        inputProps: input as unknown as Record<string, unknown>,
        audioCodec: "aac",
        crf: process.env.VOX_RENDER_CRF ? Number(process.env.VOX_RENDER_CRF) : 23,
        x264Preset: "medium",
        logLevel: "error",
        concurrency: process.env.VOX_RENDER_CONCURRENCY ? Number(process.env.VOX_RENDER_CONCURRENCY) : null,
        onProgress: ({ progress }) => {
          job.progress = progress;
        },
      });
      job.status = "done";
      job.progress = 1;
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      job.finishedAt = Date.now();
    }
  };
  job.promise = queue.then(run);
  queue = job.promise;
  return job;
}
