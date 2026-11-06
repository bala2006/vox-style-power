import type { Project, RenderInput, TimelineBlock } from "../shared/schema";

/** Demo storyboard for `npm run studio`. Silent, timed from word counts. */
const project: Project = {
  slug: "sample",
  title: "Sample: every newsroom scene",
  style: "newsroom",
  aspect: "9:16",
  fps: 30,
  captions: true,
  voice: {},
  sources: [],
  blocks: [
    {
      narration: "Every scene type in the newsroom house style, one block each, so you can check the look before a real run.",
      scene: { type: "headline", kicker: "Sample reel", headline: "Who pays for the AI boom?", highlight: "pays", subline: "A coded explainer, no generated footage." },
    },
    {
      narration: "A hero number counts up on a torn red card and lands with a stamp.",
      scene: { type: "stat", value: 4.2, prefix: "$", suffix: "T", label: "Spent on data centers", context: "Projected, twenty twenty-four to twenty thirty", source: "Example source" },
    },
    {
      narration: "Bars grow one after another, and the one that matters is painted red.",
      scene: {
        type: "bar_chart",
        title: "Capex by company",
        prefix: "$",
        unit: "B",
        bars: [
          { label: "Alpha", value: 80 },
          { label: "Beta", value: 64, highlight: true },
          { label: "Gamma", value: 41 },
          { label: "Delta", value: 22 },
        ],
      },
    },
    {
      narration: "A red line draws itself across the chart and lands on an annotated endpoint.",
      scene: {
        type: "line_chart",
        title: "Monthly users",
        unit: "M",
        points: [
          { label: "Jan", value: 12 },
          { label: "Mar", value: 18 },
          { label: "May", value: 15 },
          { label: "Jul", value: 31 },
          { label: "Sep", value: 54 },
        ],
        annotation: "Record high",
      },
    },
    {
      narration: "Two cards slam in from either side for the versus beat.",
      scene: { type: "comparison", left: { label: "Revenue", value: "$20B" }, right: { label: "Spending", value: "$200B" }, winner: "right", verdict: "Ten to one" },
    },
    {
      narration: "Items stamp in one by one, each with a red number.",
      scene: { type: "list", title: "Three warning signs", items: ["Spending outruns revenue", "Debt funds the build", "Prices fall every quarter"] },
    },
    {
      narration: "A dated line draws across, and the key moment gets the red marker.",
      scene: {
        type: "timeline",
        title: "How we got here",
        events: [
          { date: "2017", label: "Transformers paper" },
          { date: "2020", label: "GPT-3" },
          { date: "2022", label: "ChatGPT launches" },
          { date: "2025", label: "Capex peaks" },
        ],
        highlight_index: 2,
      },
    },
    {
      narration: "Only verified quotes go on a card like this, with the speaker named.",
      scene: { type: "quote", quote: "Example quote text goes here. Only ever use a verified, verbatim quote.", attribution: "Speaker name", role: "Title, organization" },
    },
    {
      narration: "And the end card lands the kicker, with the sources underneath.",
      scene: { type: "end_card", headline: "Somebody always pays.", cta: "Follow for part two", sources: ["Source one", "Source two"] },
    },
  ],
};

const fps = 30;
let cursor = 0;
const timeline: TimelineBlock[] = project.blocks.map((b, index) => {
  const tokens = b.narration.split(/\s+/).filter(Boolean);
  const words = tokens.map((text, i) => ({ text, start: i / 2.6, end: i / 2.6 + 0.34 }));
  const seconds = 0.25 + (words.at(-1)?.end ?? 1) + 0.45;
  const durationFrames = Math.ceil(seconds * fps);
  const t: TimelineBlock = { index, startFrame: cursor, durationFrames, audioOffsetFrames: Math.round(0.25 * fps), words };
  cursor += durationFrames;
  return t;
});

export const sampleInput: RenderInput = {
  project,
  timeline,
  assetBaseUrl: "",
  width: 1080,
  height: 1920,
  totalFrames: cursor,
};
