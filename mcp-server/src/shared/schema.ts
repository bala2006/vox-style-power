/**
 * The storyboard contract shared by the MCP server (runtime validation) and the
 * Remotion composition (types only). Remotion files must import this module with
 * `import type` so zod never ends up in the browser bundle.
 */
import { z } from "zod";

const shortText = (max: number) => z.string().trim().min(1).max(max);

const AccentSchema = z
  .enum(["red", "mustard", "ink"])
  .describe("Accent color for the scene's hero element. Red is the house accent; mustard is secondary.");

export const HeadlineScene = z
  .object({
    type: z.literal("headline"),
    kicker: shortText(40).optional().describe("Small label above the headline, e.g. 'THE AI BUBBLE'."),
    headline: shortText(90).describe("Condensed caps headline. Keep it under ~8 words."),
    highlight: shortText(40)
      .optional()
      .describe("Exact word or phrase inside `headline` that gets the red underline swipe."),
    subline: shortText(120).optional().describe("One supporting line under the headline."),
  })
  .describe("Big condensed headline with a red underline swipe. Use for cold opens, questions and section turns.");

export const StatScene = z
  .object({
    type: z.literal("stat"),
    value: z.number().describe("The number the counter ticks up to."),
    from: z.number().optional().describe("Counter start value. Defaults to 0."),
    prefix: z.string().max(4).optional().describe("e.g. '$'."),
    suffix: z.string().max(12).optional().describe("e.g. '%', 'B', ' bn', 'x'."),
    decimals: z.number().int().min(0).max(3).optional(),
    label: shortText(80).describe("What the number measures."),
    context: shortText(120).optional().describe("Small annotation, e.g. a date or comparison."),
    source: shortText(80).optional().describe("Source label shown as a small 'Fig.' annotation."),
    accent: AccentSchema.optional(),
  })
  .describe("A hero number on a stat card that counts up and lands with a stamp impact.");

export const BarChartScene = z
  .object({
    type: z.literal("bar_chart"),
    title: shortText(80),
    unit: z.string().max(12).optional().describe("Appended to bar values, e.g. '%' or 'B'."),
    prefix: z.string().max(4).optional(),
    bars: z
      .array(
        z.object({
          label: shortText(28),
          value: z.number(),
          highlight: z.boolean().optional().describe("Paint this bar in the accent color."),
        }),
      )
      .min(2)
      .max(8),
    source: shortText(80).optional(),
  })
  .describe("Bars grow one after another; highlighted bars are red. 2 to 8 bars.");

export const LineChartScene = z
  .object({
    type: z.literal("line_chart"),
    title: shortText(80),
    unit: z.string().max(12).optional(),
    prefix: z.string().max(4).optional(),
    points: z
      .array(z.object({ label: shortText(16), value: z.number() }))
      .min(2)
      .max(24),
    annotation: shortText(60).optional().describe("Callout attached to the last point."),
    source: shortText(80).optional(),
  })
  .describe("A red line draws itself across a gridded chart and lands on an annotated endpoint.");

const ComparisonSide = z.object({
  label: shortText(40),
  value: shortText(24).describe("Displayed as-is, e.g. '$4.2T' or '1 in 3'."),
  note: shortText(80).optional(),
});

export const ComparisonScene = z
  .object({
    type: z.literal("comparison"),
    title: shortText(80).optional(),
    left: ComparisonSide,
    right: ComparisonSide,
    winner: z.enum(["left", "right", "none"]).optional().describe("Side that gets the accent card."),
    verdict: shortText(80).optional().describe("Line stamped under the two cards."),
  })
  .describe("Two torn-paper cards slam in from either side for an A-versus-B beat.");

export const ListScene = z
  .object({
    type: z.literal("list"),
    title: shortText(80),
    items: z.array(shortText(70)).min(2).max(5),
  })
  .describe("Numbered items stamp in one by one. 2 to 5 items.");

export const QuoteScene = z
  .object({
    type: z.literal("quote"),
    quote: shortText(220).describe("Verbatim and verified. Never invent or paraphrase a quote."),
    attribution: shortText(60),
    role: shortText(80).optional(),
  })
  .describe("Pull quote on a paper card with attribution. Only for verified, verbatim quotes.");

export const TimelineScene = z
  .object({
    type: z.literal("timeline"),
    title: shortText(80).optional(),
    events: z
      .array(z.object({ date: shortText(16), label: shortText(50) }))
      .min(2)
      .max(6),
    highlight_index: z.number().int().min(0).optional().describe("Event that gets the red marker."),
  })
  .describe("A line draws across and dated markers pop in along it.");

export const ImageScene = z
  .object({
    type: z.literal("image"),
    asset: shortText(120).describe("File name returned by vox_add_asset."),
    treatment: z
      .enum(["halftone", "photo"])
      .optional()
      .describe("halftone (default) = black-and-white newsprint cutout; photo = archival photo card."),
    caption: shortText(90).optional(),
    label: shortText(40).optional().describe("Mustard label tag in the corner."),
    pins: z
      .array(
        z.object({
          label: shortText(30),
          x: z.number().min(0).max(100).describe("Percent from the left edge of the image."),
          y: z.number().min(0).max(100).describe("Percent from the top edge of the image."),
        }),
      )
      .max(6)
      .optional()
      .describe("Map pins dropped onto the image. Use with a map image to make a map scene."),
  })
  .describe("An image asset as a torn halftone cutout or archival photo card, optionally with map pins.");

export const EndCardScene = z
  .object({
    type: z.literal("end_card"),
    headline: shortText(90),
    cta: shortText(60).optional(),
    sources: z.array(shortText(90)).max(6).optional().describe("Source names shown small at the bottom."),
  })
  .describe("Closing card: the kicker line, an optional call to action and the source list.");

export const SceneSchema = z.discriminatedUnion("type", [
  HeadlineScene,
  StatScene,
  BarChartScene,
  LineChartScene,
  ComparisonScene,
  ListScene,
  QuoteScene,
  TimelineScene,
  ImageScene,
  EndCardScene,
]);

export const SCENE_TYPES = [
  HeadlineScene,
  StatScene,
  BarChartScene,
  LineChartScene,
  ComparisonScene,
  ListScene,
  QuoteScene,
  TimelineScene,
  ImageScene,
  EndCardScene,
] as const;

export const BlockSchema = z.object({
  narration: shortText(500).describe(
    "Spoken line for this block, ~20 to 24 words. Plain text, numbers spelled out, no em dashes.",
  ),
  scene: SceneSchema,
  min_seconds: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe("Hold the scene at least this long even if the narration is shorter."),
});

export const VoiceSchema = z.object({
  voice_id: z.string().min(1).max(64).optional().describe("ElevenLabs voice id. Falls back to VOX_VOICE_ID."),
  model_id: z.string().min(1).max(64).optional().describe("Defaults to eleven_multilingual_v2."),
  stability: z.number().min(0).max(1).optional(),
  similarity_boost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  speed: z.number().min(0.7).max(1.2).optional(),
  language_code: z.string().length(2).optional(),
});

export const ProjectSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "lowercase letters, digits and dashes, 2 to 63 chars")
    .describe("Folder name for the project, named for the subject, e.g. 'ai-bubble'."),
  title: shortText(120),
  style: z.enum(["newsroom"]).default("newsroom"),
  aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]).default(30),
  captions: z.boolean().default(true).describe("Burn word-synced karaoke captions."),
  voice: VoiceSchema.default({}),
  music: z
    .object({
      asset: shortText(120).describe("Audio file name returned by vox_add_asset or vox_generate_music."),
      volume: z.number().min(0).max(1).default(0.22).describe("Level between phrases."),
      duck_to: z.number().min(0).max(1).default(0.07).describe("Level while the narrator speaks."),
    })
    .optional(),
  sources: z
    .array(z.object({ title: shortText(160), url: z.string().url().max(500) }))
    .max(20)
    .default([]),
  blocks: z.array(BlockSchema).min(1).max(60),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectInput = z.input<typeof ProjectSchema>;

/** One spoken word, times in seconds relative to the start of its block. */
export type CaptionWord = { text: string; start: number; end: number };

export type TimelineBlock = {
  index: number;
  startFrame: number;
  durationFrames: number;
  /** Absent when the block has no synthesized narration (silent preview). */
  audioUrl?: string;
  /** Offset of the narration inside the block, in frames. */
  audioOffsetFrames: number;
  words: CaptionWord[];
};

export type RenderInput = {
  project: Project;
  timeline: TimelineBlock[];
  /** Base URL that project assets are served from, ending in a slash. */
  assetBaseUrl: string;
  width: number;
  height: number;
  totalFrames: number;
};

export const ASPECT_SIZES: Record<Project["aspect"], { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};
