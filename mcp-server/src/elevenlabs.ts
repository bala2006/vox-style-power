/**
 * Thin ElevenLabs REST client. Uses fetch directly so the server has no SDK
 * dependency. The API key is read from ELEVENLABS_API_KEY and never logged or
 * returned to the client.
 */
import type { CaptionWord } from "./shared/schema.js";

const API_BASE = (process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io").replace(/\/$/, "");
export const DEFAULT_TTS_MODEL = process.env.VOX_TTS_MODEL ?? "eleven_multilingual_v2";
const REQUEST_TIMEOUT_MS = 120_000;

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new ElevenLabsError(
      "ELEVENLABS_API_KEY is not set. Add it to the env block of this MCP server in your client config.",
    );
  }
  return key;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

async function request(path: string, init: RequestInit & { query?: Record<string, string | undefined> } = {}) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, {
    ...init,
    headers: { "xi-api-key": apiKey(), "content-type": "application/json", ...(init.headers ?? {}) },
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.text();
      detail = body.slice(0, 500);
    } catch {
      /* ignore */
    }
    const hint =
      res.status === 401
        ? " (check ELEVENLABS_API_KEY)"
        : res.status === 429
          ? " (rate limited or out of quota)"
          : "";
    throw new ElevenLabsError(`ElevenLabs ${path} failed with HTTP ${res.status}${hint}: ${detail}`, res.status);
  }
  return res;
}

export type VoiceSummary = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
};

export async function listVoices(opts: { search?: string; pageSize?: number } = {}): Promise<VoiceSummary[]> {
  const res = await request("/v2/voices", {
    method: "GET",
    query: {
      search: opts.search,
      page_size: String(Math.min(Math.max(opts.pageSize ?? 30, 1), 100)),
      include_total_count: "false",
    },
  });
  const data = (await res.json()) as { voices?: Array<Record<string, unknown>> };
  return (data.voices ?? []).map((v) => ({
    voice_id: String(v.voice_id),
    name: String(v.name ?? ""),
    category: v.category as string | undefined,
    description: (v.description as string | undefined) ?? undefined,
    labels: v.labels as Record<string, string> | undefined,
    preview_url: v.preview_url as string | undefined,
  }));
}

export type SubscriptionInfo = {
  tier?: string;
  character_count?: number;
  character_limit?: number;
  next_reset_unix?: number;
};

export async function getSubscription(): Promise<SubscriptionInfo> {
  const res = await request("/v1/user/subscription", { method: "GET" });
  const d = (await res.json()) as Record<string, unknown>;
  return {
    tier: d.tier as string | undefined,
    character_count: d.character_count as number | undefined,
    character_limit: d.character_limit as number | undefined,
    next_reset_unix: d.next_character_count_reset_unix as number | undefined,
  };
}

type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type SpeechResult = {
  audio: Buffer;
  words: CaptionWord[];
  speechEnd: number;
  requestId?: string;
};

export async function synthesizeWithTimestamps(args: {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: { stability?: number; similarity_boost?: number; style?: number; speed?: number };
  languageCode?: string;
  previousText?: string;
  nextText?: string;
}): Promise<SpeechResult> {
  const body: Record<string, unknown> = {
    text: args.text,
    model_id: args.modelId ?? DEFAULT_TTS_MODEL,
  };
  if (args.voiceSettings && Object.values(args.voiceSettings).some((v) => v !== undefined)) {
    body.voice_settings = args.voiceSettings;
  }
  if (args.languageCode) body.language_code = args.languageCode;
  if (args.previousText) body.previous_text = args.previousText;
  if (args.nextText) body.next_text = args.nextText;

  const res = await request(`/v1/text-to-speech/${encodeURIComponent(args.voiceId)}/with-timestamps`, {
    method: "POST",
    query: { output_format: "mp3_44100_128" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { audio_base64: string; alignment?: Alignment | null };
  if (!data.audio_base64) throw new ElevenLabsError("ElevenLabs returned no audio.");
  const words = data.alignment ? alignmentToWords(data.alignment) : [];
  const speechEnd = words.length ? words[words.length - 1].end : 0;
  return {
    audio: Buffer.from(data.audio_base64, "base64"),
    words,
    speechEnd,
    requestId: res.headers.get("request-id") ?? undefined,
  };
}

/** Collapse ElevenLabs character timings into whitespace-delimited words. */
export function alignmentToWords(a: Alignment): CaptionWord[] {
  const words: CaptionWord[] = [];
  let text = "";
  let start = 0;
  let end = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    if (/\s/.test(ch)) {
      if (text) words.push({ text, start, end });
      text = "";
      continue;
    }
    if (!text) start = a.character_start_times_seconds[i] ?? end;
    text += ch;
    end = a.character_end_times_seconds[i] ?? start;
  }
  if (text) words.push({ text, start, end });
  return words;
}

export async function composeMusic(args: { prompt: string; lengthMs: number }): Promise<Buffer> {
  const res = await request("/v1/music", {
    method: "POST",
    query: { output_format: "mp3_44100_128" },
    body: JSON.stringify({ prompt: args.prompt, music_length_ms: args.lengthMs, force_instrumental: true }),
    signal: AbortSignal.timeout(300_000),
  });
  return Buffer.from(await res.arrayBuffer());
}
