#!/usr/bin/env node
/**
 * End-to-end smoke test over real MCP stdio.
 *
 *   node scripts/smoke.mjs            silent run: save, preview every block, render MP4
 *   node scripts/smoke.mjs --mock-tts also stands up a fake ElevenLabs API that
 *                                     returns a tone MP3 + character alignment, to
 *                                     exercise synthesis, captions and audio mixing
 *                                     without spending credits.
 *
 * Writes into ./vox-output-smoke so it never touches real projects.
 */
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "vox-output-smoke");
const mock = process.argv.includes("--mock-tts");
const aspect = process.argv.find((a) => a.startsWith("--aspect="))?.split("=")[1] ?? "9:16";

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`ok   ${msg}`);
}

async function startMockElevenLabs() {
  const ffmpeg = path.join(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg");
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    if (req.url.startsWith("/v1/text-to-speech/")) {
      const { text } = JSON.parse(body);
      const secs = Math.max(1, text.split(/\s+/).length / 2.8);
      const tmp = path.join(OUT, `tone-${Date.now()}.mp3`);
      const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `sine=frequency=220:duration=${secs}`, "-ar", "44100", "-b:a", "128k", tmp]);
      if (r.status !== 0) {
        res.writeHead(500).end(String(r.stderr));
        return;
      }
      const audio = await fs.readFile(tmp);
      await fs.rm(tmp);
      const chars = [...text];
      const per = secs / chars.length;
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          audio_base64: audio.toString("base64"),
          alignment: {
            characters: chars,
            character_start_times_seconds: chars.map((_, i) => i * per),
            character_end_times_seconds: chars.map((_, i) => (i + 1) * per),
          },
        }),
      );
      return;
    }
    if (req.url.startsWith("/v1/music")) {
      const { music_length_ms } = JSON.parse(body);
      const tmp = path.join(OUT, `music-${Date.now()}.mp3`);
      spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `sine=frequency=660:duration=${music_length_ms / 1000}`, "-ar", "44100", "-b:a", "128k", tmp]);
      const audio = await fs.readFile(tmp);
      await fs.rm(tmp);
      res.writeHead(200, { "content-type": "audio/mpeg" }).end(audio);
      return;
    }
    if (req.url.startsWith("/v1/user/subscription")) {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ tier: "mock", character_count: 100, character_limit: 10000 }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

const project = {
  slug: "smoke-ai-capex",
  title: "Who pays for the AI build-out",
  aspect,
  voice: { voice_id: "mock-voice" },
  sources: [
    { title: "Example source one", url: "https://example.com/one" },
    { title: "Example source two", url: "https://example.com/two" },
  ],
  blocks: [
    { narration: "Four companies plan to spend more on data centers this year than most countries spend on anything.", scene: { type: "headline", kicker: "The AI build-out", headline: "Who pays for the AI boom?", highlight: "pays" } },
    { narration: "The combined bill is about four hundred billion dollars, and almost none of it is paid back yet.", scene: { type: "stat", value: 400, prefix: "$", suffix: "B", label: "Planned capex this year", source: "Example source one" } },
    { narration: "Split by company, one of them is spending far faster than its revenue can explain.", scene: { type: "bar_chart", title: "Capex by company", prefix: "$", unit: "B", bars: [{ label: "Alpha", value: 120 }, { label: "Beta", value: 105, highlight: true }, { label: "Gamma", value: 95 }, { label: "Delta", value: 80 }] } },
    { narration: "Meanwhile the price of running a model keeps falling, roughly in half every few months.", scene: { type: "line_chart", title: "Cost per million tokens", prefix: "$", points: [{ label: "2023", value: 60 }, { label: "2024", value: 20 }, { label: "2025", value: 6 }, { label: "2026", value: 1.5 }], annotation: "Down ninety-seven percent" } },
    { narration: "So the spending side and the revenue side are not even in the same order of magnitude.", scene: { type: "comparison", left: { label: "AI revenue", value: "$40B" }, right: { label: "AI capex", value: "$400B" }, winner: "right", verdict: "Ten to one" } },
    { narration: "There are three ways this can resolve, and only one of them is comfortable for investors.", scene: { type: "list", title: "Three endings", items: ["Demand catches up", "Prices rise", "Write-downs"] } },
    { narration: "We have seen this shape before, with railways, with fiber, and each time someone else got the bargain.", scene: { type: "timeline", title: "Build first, pay later", events: [{ date: "1840s", label: "Railway mania" }, { date: "1999", label: "Fiber glut" }, { date: "2026", label: "AI capex" }], highlight_index: 2 } },
    { narration: "Most of that money lands in a handful of places, wherever power is cheap and land is flat.", scene: { type: "image", asset: "board.png", caption: "Where the money lands", label: "Fig. 3", pins: [{ label: "Site A", x: 30, y: 40 }, { label: "Site B", x: 70, y: 62 }] } },
    { narration: "The builders rarely keep the value. The people who buy the leftovers cheaply usually do.", scene: { type: "end_card", headline: "Somebody always pays.", sources: ["Example source one", "Example source two"] } },
  ],
};

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  const env = { ...process.env, VOX_OUTPUT_DIR: OUT };
  delete env.ELEVENLABS_API_KEY;
  let mockServer;
  if (mock) {
    mockServer = await startMockElevenLabs();
    env.ELEVENLABS_API_KEY = "mock-key";
    env.ELEVENLABS_BASE_URL = mockServer.url;
  }

  const client = new Client({ name: "vox-smoke", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(ROOT, "dist/index.js")], env, stderr: "inherit" }));

  const tools = (await client.listTools()).tools.map((t) => t.name);
  console.log("tools:", tools.join(", "));
  assert(tools.length === 13, "13 tools registered");
  const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
  assert(prompts.includes("vox_explainer"), "vox_explainer prompt registered");
  const resources = (await client.listResources()).resources.map((r) => r.uri);
  assert(resources.length === 3, `3 resources: ${resources.join(", ")}`);

  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 1_500_000, resetTimeoutOnProgress: true });
    const txt = r.content.find((c) => c.type === "text")?.text ?? "";
    if (r.isError) {
      console.error(txt);
      throw new Error(`${name} failed`);
    }
    return { r, txt, json: (() => { try { return JSON.parse(txt); } catch { return null; } })() };
  };

  const scenes = await call("vox_list_scene_types", {});
  assert(scenes.json.length === 10, "10 scene templates");

  const bad = await client.callTool({ name: "vox_save_project", arguments: { project: { ...project, blocks: [{ narration: "x", scene: { type: "stat" } }] } } });
  assert(bad.isError, "invalid storyboard is rejected");

  const first = await call("vox_save_project", { project });
  assert(first.json.warnings.some((w) => w.includes("board.png")), "missing asset is flagged");
  const sheet = path.resolve(ROOT, "../plugins/vox-style/skills/vox-style/assets/newsroom-style-sheet.png");
  const asset = await call("vox_add_asset", { slug: project.slug, source: sheet, name: "board.png" });
  assert(asset.json.asset === "board.png", "asset added from local path");
  const saved = await call("vox_save_project", { project });
  console.log("warnings:", saved.json.warnings);
  assert(saved.json.warnings.length === 0, "project saved with no warnings");

  const plan = await call("vox_plan_timing", { slug: project.slug });
  console.log(`estimated ${plan.json.total_seconds}s, ${plan.json.elevenlabs.characters_to_synthesize} chars`);

  if (mock) {
    const syn = await call("vox_synthesize_narration", { slug: project.slug });
    assert(syn.json.blocks.every((b) => b.status === "synthesized"), "all blocks synthesized via mock ElevenLabs");
    const again = await call("vox_synthesize_narration", { slug: project.slug });
    assert(again.json.blocks.every((b) => b.status === "unchanged") && again.json.characters_billed === 0, "re-run skips unchanged blocks");
    const music = await call("vox_generate_music", { slug: project.slug });
    assert(music.json.asset === "music.mp3", `music bed generated (${music.json.seconds}s)`);
    const timing = await call("vox_plan_timing", { slug: project.slug });
    assert(timing.json.blocks.every((b) => b.timing === "measured"), "timing now measured from real audio");
  }

  for (let b = 1; b <= project.blocks.length; b++) {
    const p = await call("vox_render_preview", { slug: project.slug, block: b, at: 0.7 });
    const img = p.r.content.find((c) => c.type === "image");
    assert(img && img.data.length > 1000, `preview block ${b} -> ${p.json.file}`);
  }

  const t0 = Date.now();
  let render = await call("vox_render_video", { slug: project.slug, wait_seconds: 1200 });
  let job = render.json.jobs[0];
  while (job.status === "rendering" || job.status === "queued") job = (await call("vox_render_status", { job_id: job.job_id, wait_seconds: 60 })).json;
  assert(job.status === "done", `rendered ${job.output} (${job.duration_seconds}s video in ${Math.round((Date.now() - t0) / 1000)}s)`);
  const stat = await fs.stat(job.output);
  assert(stat.size > 100_000, `mp4 is ${(stat.size / 1e6).toFixed(1)} MB`);
  if (mock) assert(!job.silent_blocks, "no silent blocks");

  await client.close();
  mockServer?.server.close();
  console.log("SMOKE PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
