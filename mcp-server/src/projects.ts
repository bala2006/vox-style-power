/**
 * Project storage on disk. Every project lives in its own folder:
 *
 *   <VOX_OUTPUT_DIR>/<slug>/
 *     project.json          validated storyboard
 *     assets/               images and music added with vox_add_asset
 *     audio/block-01.mp3    narration per block
 *     audio/block-01.json   word timings + the narration text it was made from
 *     renders/              stills and final MP4s
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ProjectSchema,
  type CaptionWord,
  type Project,
  type ProjectInput,
  type TimelineBlock,
} from "./shared/schema.js";

export const OUTPUT_ROOT = path.resolve(
  process.env.VOX_OUTPUT_DIR?.trim() || path.join(os.homedir(), "vox-output"),
);

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg"]);
const MAX_ASSET_BYTES = 50 * 1024 * 1024;

/** Silence before the narrator starts, and breathing room after, per block. */
const LEAD_IN_SECONDS = 0.25;
const TAIL_SECONDS = 0.45;
/** Speaking rate used for silent previews before narration exists. */
const FALLBACK_WORDS_PER_SECOND = 2.6;

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectError";
  }
}

export function projectDir(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) throw new ProjectError(`Invalid slug "${slug}".`);
  return path.join(OUTPUT_ROOT, slug);
}

export const paths = {
  project: (slug: string) => path.join(projectDir(slug), "project.json"),
  assets: (slug: string) => path.join(projectDir(slug), "assets"),
  audio: (slug: string) => path.join(projectDir(slug), "audio"),
  renders: (slug: string) => path.join(projectDir(slug), "renders"),
  blockAudio: (slug: string, i: number) => path.join(projectDir(slug), "audio", `block-${pad(i + 1)}.mp3`),
  blockMeta: (slug: string, i: number) => path.join(projectDir(slug), "audio", `block-${pad(i + 1)}.json`),
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function textHash(text: string, voiceKey: string) {
  return createHash("sha256").update(`${voiceKey}\n${text}`).digest("hex").slice(0, 16);
}

export function voiceKey(project: Project, voiceId: string) {
  const v = project.voice;
  return JSON.stringify([voiceId, v.model_id, v.stability, v.similarity_boost, v.style, v.speed, v.language_code]);
}

export type BlockAudioMeta = {
  text_hash: string;
  narration: string;
  voice_id: string;
  words: CaptionWord[];
  speech_end: number;
  audio_seconds: number;
};

export async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function listProjects(): Promise<string[]> {
  try {
    const entries = await fs.readdir(OUTPUT_ROOT, { withFileTypes: true });
    const out: string[] = [];
    for (const e of entries) if (e.isDirectory() && (await exists(path.join(OUTPUT_ROOT, e.name, "project.json")))) out.push(e.name);
    return out.sort();
  } catch {
    return [];
  }
}

export async function loadProject(slug: string): Promise<Project> {
  const file = paths.project(slug);
  if (!(await exists(file))) throw new ProjectError(`No project "${slug}". Create it with vox_save_project first.`);
  return ProjectSchema.parse(JSON.parse(await fs.readFile(file, "utf8")));
}

export async function saveProject(input: ProjectInput): Promise<{ project: Project; warnings: string[] }> {
  const parsed = ProjectSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new ProjectError(`Storyboard is invalid:\n- ${issues.join("\n- ")}`);
  }
  const project = parsed.data;
  await fs.mkdir(paths.assets(project.slug), { recursive: true });
  await fs.mkdir(paths.audio(project.slug), { recursive: true });
  await fs.mkdir(paths.renders(project.slug), { recursive: true });
  const warnings = await lintProject(project);
  await fs.writeFile(paths.project(project.slug), JSON.stringify(project, null, 2) + "\n");
  return { project, warnings };
}

/** Non-fatal checks that encode the house rules. */
export async function lintProject(project: Project): Promise<string[]> {
  const w: string[] = [];
  const assets = new Set(await listAssets(project.slug));
  project.blocks.forEach((b, i) => {
    const n = `Block ${i + 1}`;
    const words = b.narration.split(/\s+/).filter(Boolean).length;
    if (/[\u2014\u2013]/.test(b.narration)) w.push(`${n}: narration contains an em or en dash. Use a comma, period, colon or parens.`);
    if (/\d/.test(b.narration)) w.push(`${n}: narration contains digits. Spell numbers out so the voice reads them the way you intend.`);
    if (words > 30) w.push(`${n}: narration is ${words} words; ~20 to 24 keeps blocks near 8 to 9 seconds.`);
    if (/\bin this video\b/i.test(b.narration)) w.push(`${n}: avoid "in this video".`);
    const s = b.scene;
    if (s.type === "headline" && s.highlight && !s.headline.toLowerCase().includes(s.highlight.toLowerCase()))
      w.push(`${n}: highlight "${s.highlight}" does not appear in the headline, so no underline will be drawn.`);
    if (s.type === "image" && !assets.has(s.asset)) w.push(`${n}: asset "${s.asset}" is not in the project yet. Add it with vox_add_asset.`);
    if (s.type === "timeline" && s.highlight_index !== undefined && s.highlight_index >= s.events.length)
      w.push(`${n}: highlight_index is past the last event.`);
  });
  if (project.music && !assets.has(project.music.asset)) w.push(`music: asset "${project.music.asset}" is not in the project yet.`);
  if (project.sources.length === 0) w.push("No sources listed. Every number needs two independent sources; record them in `sources`.");
  return w;
}

export async function listAssets(slug: string): Promise<string[]> {
  try {
    return (await fs.readdir(paths.assets(slug))).filter((f) => !f.startsWith(".")).sort();
  } catch {
    return [];
  }
}

function safeAssetName(name: string, fallbackExt: string): string {
  const base = path.basename(name).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = path.extname(base);
  const stem = (ext ? base.slice(0, -ext.length) : base) || "asset";
  return `${stem.slice(0, 80)}${ext || fallbackExt}`;
}

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
};

export async function addAsset(slug: string, source: string, name?: string): Promise<{ name: string; bytes: number }> {
  if (!(await exists(paths.project(slug)))) throw new ProjectError(`No project "${slug}". Save the project first.`);
  let data: Buffer;
  let ext = "";
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
    if (!res.ok) throw new ProjectError(`Download failed with HTTP ${res.status}: ${source}`);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_ASSET_BYTES) throw new ProjectError("Asset is larger than 50 MB.");
    data = Buffer.from(await res.arrayBuffer());
    const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    ext = MIME_EXT[mime] ?? path.extname(url.pathname).toLowerCase();
  } else {
    const abs = path.resolve(source);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat?.isFile()) throw new ProjectError(`Not a file: ${abs}`);
    if (stat.size > MAX_ASSET_BYTES) throw new ProjectError("Asset is larger than 50 MB.");
    data = await fs.readFile(abs);
    ext = path.extname(abs).toLowerCase();
    name ??= path.basename(abs);
  }
  if (data.length > MAX_ASSET_BYTES) throw new ProjectError("Asset is larger than 50 MB.");
  if (!IMAGE_EXT.has(ext) && !AUDIO_EXT.has(ext)) {
    throw new ProjectError(`Unsupported asset type "${ext || "unknown"}". Use png, jpg, webp, gif, svg, mp3, wav, m4a, aac or ogg.`);
  }
  let finalName = safeAssetName(name ?? `asset${ext}`, ext);
  if (path.extname(finalName) !== ext && !(IMAGE_EXT.has(path.extname(finalName)) || AUDIO_EXT.has(path.extname(finalName)))) {
    finalName += ext;
  }
  await fs.mkdir(paths.assets(slug), { recursive: true });
  await fs.writeFile(path.join(paths.assets(slug), finalName), data);
  return { name: finalName, bytes: data.length };
}

export async function writeAssetBuffer(slug: string, name: string, data: Buffer): Promise<string> {
  const finalName = safeAssetName(name, ".mp3");
  await fs.mkdir(paths.assets(slug), { recursive: true });
  await fs.writeFile(path.join(paths.assets(slug), finalName), data);
  return finalName;
}

export async function readBlockMeta(slug: string, i: number): Promise<BlockAudioMeta | null> {
  try {
    return JSON.parse(await fs.readFile(paths.blockMeta(slug, i), "utf8")) as BlockAudioMeta;
  } catch {
    return null;
  }
}

/**
 * Duration of a constant-bitrate MP3 (what ElevenLabs returns for
 * mp3_44100_128). Skips an ID3v2 tag and reads the first frame header.
 */
export function mp3DurationSeconds(buf: Buffer): number {
  let offset = 0;
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    offset = 10 + size;
  }
  while (offset + 4 < buf.length && !(buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0)) offset++;
  if (offset + 4 >= buf.length) return 0;
  const b1 = buf[offset + 1];
  const b2 = buf[offset + 2];
  const versionBits = (b1 >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layerBits = (b1 >> 1) & 0x03; // 1 = Layer III
  const bitrateIdx = (b2 >> 4) & 0x0f;
  const mpeg1 = versionBits === 3;
  if (layerBits !== 1) return 0;
  const table = mpeg1
    ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const kbps = table[bitrateIdx];
  if (!kbps) return 0;
  return ((buf.length - offset) * 8) / (kbps * 1000);
}

function fallbackWords(text: string): CaptionWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const per = 1 / FALLBACK_WORDS_PER_SECOND;
  return tokens.map((t, i) => ({ text: t, start: i * per, end: i * per + per * 0.9 }));
}

export type BuiltTimeline = {
  timeline: TimelineBlock[];
  totalFrames: number;
  missingAudio: number[];
  staleAudio: number[];
};

/**
 * Lay blocks end to end. Each block lasts as long as its narration plus a
 * short lead-in and tail, never shorter than `min_seconds`. Blocks without
 * up-to-date narration are timed from the word count and rendered silent.
 */
export async function buildTimeline(project: Project, assetBaseUrl: string | null): Promise<BuiltTimeline> {
  const fps = project.fps;
  const timeline: TimelineBlock[] = [];
  const missingAudio: number[] = [];
  const staleAudio: number[] = [];
  let cursor = 0;
  for (let i = 0; i < project.blocks.length; i++) {
    const block = project.blocks[i];
    const meta = await readBlockMeta(project.slug, i);
    const fresh = meta && meta.narration === block.narration && (await exists(paths.blockAudio(project.slug, i)));
    if (!meta) missingAudio.push(i + 1);
    else if (!fresh) staleAudio.push(i + 1);

    const words = fresh ? meta!.words : fallbackWords(block.narration);
    const speechEnd = fresh ? Math.max(meta!.speech_end, 0) : (words.at(-1)?.end ?? 1);
    const audioSeconds = fresh ? meta!.audio_seconds : 0;
    const seconds = Math.max(block.min_seconds ?? 0, LEAD_IN_SECONDS + Math.max(speechEnd + TAIL_SECONDS, audioSeconds), 1.5);
    const durationFrames = Math.ceil(seconds * fps);
    timeline.push({
      index: i,
      startFrame: cursor,
      durationFrames,
      audioUrl: fresh && assetBaseUrl ? `${assetBaseUrl}audio/block-${pad(i + 1)}.mp3` : undefined,
      audioOffsetFrames: Math.round(LEAD_IN_SECONDS * fps),
      words,
    });
    cursor += durationFrames;
  }
  return { timeline, totalFrames: cursor, missingAudio, staleAudio };
}
