<!-- VENDORED. Source: higgsfield-ai/skills @ 0.12.0, hand-adapted to the MCP as 1.2-mcp.
     The same content is installed as a live skill at skills/higgsfield-video-explainer/.
     This copy exists so the vox-style bundle stays self-contained for standalone upload.
     Re-vendor: git clone --depth 1 https://github.com/higgsfield-ai/skills /tmp/hf
     Check drift: get_workflow_bundle_file(workflow: "video-explainer", path: "SKILL.md") -->

---
name: higgsfield-video-explainer
version: 1.2-mcp
description: |
  Build a complete non-photoreal narrated explainer or story video from
  ordered 10-second blocks: one narrator, one universal style key, one Seed
  Audio take and one Gemini Omni clip per block, then server-side assembly
  with the explainer_video tool. Use when: "make an explainer video", "explain
  this in a video", "turn this topic or document into a narrated video", "tell
  this story as an animated video", "make a faceless narrated video", or "show
  me explainer styles". Supports live CMS presets, custom style references,
  mascot/faceless modes, two aspects, and optional burned subtitles. NOT for:
  photoreal films, ads/UGC, talking heads, podcasts, motion typography reels,
  one-off clips without narration, or editing a finished video.
argument-hint: "[topic or source files] [duration] [language] [aspect ratio]"
---

# Video Explainer — Higgsfield MCP edition

> **Provenance.** This file is the official Higgsfield `video-explainer`
> workflow, v1.2, re-vendored **from the Higgsfield MCP server** rather than
> from the CLI skills repo. Refresh it with:
>
> ```
> get_workflow_instructions(workflow: "video-explainer")
> get_workflow_bundle_file(workflow: "video-explainer", path: "references/prompts.md")
> ```
>
> Every tool named below is an `mcp__Higgsfield__*` tool. There is no
> `higgsfield` CLI in this project and none is needed.

Turn one request — a topic OR a personal/philosophical story, with an optional
reference image for style — into a narrated NON-photoreal animated video.
Method: lock one visual **style key** image, attach it to every clip, keep all
spoken words out of the clips, and voice the narration **per 10-second block**
so each block's audio lands exactly on its clip. Length is
`N = duration_minutes × 6` blocks (each block = one 10-second clip).

Steps that "ask the user" or "search the web" use the **host's own** tools, not
the MCP server. Assembly (Phase 6) runs server-side via `explainer_video`.

## Phase 0 — ASK FIRST (required)

Phase 0 collects the settings below and runs in **TWO separate turns, in this
order** — never merged into one.

**Turn 1 — Style (gallery only, nothing else).** Call `get_explainer_presets`.
Say one short line ("Pick a visual style from the gallery — or describe your
own / attach reference photos"), then **end your turn**. Choosing a style is
mandatory: stop and wait. Skip this turn only if the request already carries an
`explainer preset id: <uuid>`.

**Turn 2 — everything else (host question tool), only AFTER the style is
answered:**

- **Duration** — in **minutes** (1–10). `N = minutes × 6` blocks.
- **Language** — narration language. Default English. Still offer it.
- **Character** — **mascot** (recurring on-screen host) or **faceless**.
- **Aspect** — `16:9` (default) or `9:16` vertical.
- **Subtitles** — on or off, burned **server-side**, synced to the voiceover.
  Default off. Costs 0.05 credit per voiced block (Whisper transcription), and
  is **always paid in credits, even on an unlim run**. If ON, ask which caption
  font and wait: `patrick` (legible handwritten, default) · `caveat` (flowing
  cursive) · `marker` (bold marker) · `anton` (heavy condensed impact).

**Every Phase 0 choice belongs to the USER** — recommend, never decide
silently. The only exception is the user explicitly saying "you choose".

> **Vox overrides this phase.** Invoked through `vox-style`, Phase 0 becomes the
> **wizard**: a fixed seven-question list, one screen each, with `.env` supplying
> the recommended default on every question rather than answering it silently.
> The style gallery and the voice roster open only when a wizard answer asks for
> them. It still ends at vox's single approval gate. That deviation is documented
> in `SKILL.md`.

## Inputs (after Phase 0)

- **query_text** — the topic or the personal story.
- **preset_id** (optional) — a style preset from `get_explainer_presets`,
  resolved in Phase 1 with `resolve_explainer_preset`. Mutually exclusive with
  reference_photos.
- **reference_photos** (optional) — images whose **style only** (render look +
  color grading) drives the visuals; their content is never copied. Import with
  `media_import_url` (web URL) or `media_upload` / `media_upload_widget` (local
  file) and pass the returned `media_id` in `medias`.
- **duration_minutes** (1–10) → `N = minutes × 6` blocks.
- **character** — mascot | faceless. **language** — default English.
- **aspect** — 16:9 (default) | 9:16.

## Hard rules

- **No realism. Ever.** Strictly non-photorealistic. Every prompt says so and
  negates photoreal / 3D render / live-action.
- **Faceless audio in clips.** Nobody talks inside a clip — no dialogue, no
  lip-sync, no baked voiceover. Each clip's `AUDIO` line is ambient SFX/music.
- **Per-block, no timecodes.** Narration is written and voiced as **N separate
  blocks**, labeled `Block 1 … Block N`, one per 10s clip. Block N's audio goes
  on clip N — this is what keeps audio and video locked.
- **One universal style key**, attached as the image reference to **every**
  clip. The prompt text names the look; the image locks it. The key's aspect
  ratio sets the video framing.
- **Accuracy.** For real people/events: no fabricated quotes, no invented
  numbers. Keep a Sources line.
- **All prompts in English** (only the spoken narration uses `language`).
- **Research before writing.** For real topics, gather facts with web search
  first (Phase R) — never script from memory alone.
- **Always assemble — automatically.** The moment Phases 4–5 finish, stitch
  every clip + its voice take into ONE final MP4 with `explainer_video`, in the
  same run, without being asked. Delivering loose clips is a failure.

## Pipeline

| Phase | Output | Tool |
|---|---|---|
| 0 Ask | style first (gallery, wait), then duration · language · character · aspect | `get_explainer_presets`, then host question tool |
| R Research | facts + sources | host web search (+ fetch) |
| 1 Style key | one universal style-reference image | `generate_image` (`nano_banana_pro`) |
| 2 Narration | N narration blocks (text) | reasoning |
| 3 Block prompts | N labeled video prompts (text) | reasoning |
| 4 Clips | N × 10s video | `generate_video` (`gemini_omni`) |
| 5 Voice | user picks voice once, then N takes | `list_voices` + `generate_audio` (`seed_audio`) |
| 6 Assemble | final MP4 | `explainer_video` |

Templates for Phases 1–3 are in `references/prompts.md` — read it first. Text
phases (2, 3) are free; Phases 1, 4, 5 cost credits.

## Job model

`generate_image` / `generate_video` / `generate_audio` submit a job and return a
**job id** plus, in this client, the finished result. If a call returns a job
that is still running, re-read it with `job_display(id)` rather than
re-submitting — never duplicate a running job.

- A completed generation's **job id can be reused as a `medias[].value`** on a
  later generation — so the style-key **job id** is what you attach to every
  clip. You do not need its URL for that.
- `explainer_video` likewise takes **job ids** for each block's clip and voice.

## Unlimited generations (`use_unlim`)

Opt-in only, and the user's call: pass `use_unlim: true` only when they
explicitly ask to spend their unlimited / free-trial generations. Never add it
on your own initiative, and never quietly drop it once they have asked. Send the
flag rather than pre-gating on `supports_unlim` — a request that cannot be
served free is **rejected**, never silently charged.

Models this workflow would check: `nano_banana_pro` (Phase 1, skipped when a
preset supplies the key), `gemini_omni` (Phase 4), `seed_audio` (Phase 5). Use
`models_explore(action:"get", model_id:…)` and read the trailing
**`Unlim configs`** rows for covered parameters. If Phase 4's covered
`max_duration` is below 10, **stop and ask**: run the covered duration `D` (then
`D` replaces 10 everywhere and `N = round(minutes × 60 / D)`), or keep 10s clips
and pay credits.

`explainer_video` takes no `use_unlim` — assembly is free either way, but
subtitles always cost credits.

Rejections — never retry the same call:

- `unlim_trial_available` → carries `recovery_tool: show_plans_and_credits`;
  call it immediately, then wait.
- `unlim_trial_expired` / `unlim_not_eligible` → the allowance is gone. Stop and
  ask before continuing on credits; this can land mid-run.
- `unlim_not_supported` → that model has no unlim path.
- `unlim_config_not_covered` → re-read the `Unlim configs` rows and retry inside
  them.

## Phase R — Research the topic (required)

Before writing the script, gather real information about `query_text`.

- **Topic** → host web search (and fetch on the best sources) for current,
  accurate facts, names, dates and numbers. Keep a short **Sources** list.
- **Personal story** → skip web search; build only from the user's details and
  invent nothing factual.

## Phase 1 — Style key

Write a reusable **STYLE descriptor** (render style + palette + line/finish +
`non-photorealistic, no live-action, no realism`). Make **one** key image with
`generate_image`, model `nano_banana_pro`, in the chosen aspect. Keep its **job
id** → the `medias` image reference on every clip.

- **With a preset:** call `resolve_explainer_preset(preset_id)` — it imports the
  preset's style image and returns a **`media_id`**. **Skip generating a key**
  (this branch is free): that `media_id` IS the style key. Framing then follows
  the preset image.
- **With a local style sheet:** upload it with `media_upload` (or
  `media_upload_widget`), confirm with `media_confirm`, and use the returned
  `media_id` as the key. Also free.
- **No photos:** an **abstract style swatch** (text-only, no characters /
  objects / letters), or — if `character` is on — the character rendered
  in-style as the key.
- **With reference_photos:** import each, pass all as `medias` (role `image`),
  and use the **style-only prefix** verbatim from `references/prompts.md`.

```
generate_image
  model: "nano_banana_pro"
  prompt: <STYLE descriptor / swatch prompt>
  aspect_ratio: "16:9"          # or "9:16" for vertical
  medias: [ { value: "<imported media_id>", role: "image" } ]   # reference_photos only
```

## Phase 2 — Narration (per block, plain text)

Write the voiceover as **N labeled blocks**, one per 10s clip, in order.

- **One block = one clip.** Each line lands **~8–9 seconds** of speech (~20–24
  words), and every take stays **under ~9.5s**. The block window is fixed; a
  small overrun is sped up pitch-safely, the video is never stretched.
- **No emotion cues, no parentheticals, no stage directions.**
- **Spell numbers out** — "twenty percent", "nineteen fifty-eight".
- Tone set by the topic; concrete; no "in this video".

## Phase 3 — Block prompts (video)

Write **N** video prompts, one per block, labeled `Block N` (no timecodes), in
the labeled format (full template in `references/prompts.md`):

```
Block 1
STYLE REFERENCE: Match the attached style key EXACTLY — {STYLE tokens}.
SCENE: {scene + action for this block, matching its narration line}.
MOTION: {camera move + animation behavior}.
AUDIO: {ambient SFX / music only — no voice, no narration}.
NEGATIVE: color drift, photorealism, 3D render, lip-sync, captions, on-screen text, watermark{, + style-specific bans}.
```

`AUDIO` is diegetic only. Keep the world and (if on) the character consistent.

## Phase 4 — Render clips (`gemini_omni`)

Submit **N** `generate_video` jobs, the style key on each:

```
generate_video
  model: "gemini_omni"
  prompt: <Block N video prompt>
  duration: 10
  resolution: "720p"          # only supported value
  medias: [ { value: "<style key job id or preset media_id>", role: "image" } ]
```

`gemini_omni` inherits framing from the key image (9:16 key → vertical, 16:9 key
→ landscape) — do **not** pass `aspect_ratio`. `duration` range is 4–10; use 10.

> **⚠ VOX OVERRIDES THIS LINE.** The claim above is upstream's and it is wrong
> in practice: on a real run a 9:16 style key still produced 16:9 clips. Vox
> passes `aspect_ratio` explicitly on every clip. See `SKILL.md`,
> Phase 4. Re-test before trusting upstream again.
>
> Upstream also does not mention that the server intercepts stylized prompts
> with `preset_recommendation` notices. Never accept one — resubmit with
> `declined_preset_id` from `retry_literal_with`.
Reusing the same key job id across all clips holds the style. Save every clip's
job id. Scale: 10 min = 60 clips — submit in batches and re-submit only failed
blocks. If `gemini_omni` is rejected, confirm the id with
`models_explore(type:'video')` rather than silently switching models.

**Live cost, measured 2026-07-29:** 30 credits per 10s 720p clip. Always
re-check with `get_cost: true` instead of trusting this number.

## Phase 5 — Voiceover (Seed Audio 1.0, per block)

**The USER picks the narrator voice, once, up front.** `generate_audio` is
single-sample, so you make **N separate calls**, all with the same voice.

1. Call `list_voices` (it renders a voice picker), ask which narrator to use,
   and **wait**. Keep the exact **`voice_id`** and **`voice_type`**
   (`"preset"` or `"element"`).
2. Voice each block with its own call, reusing that same pair:

```
generate_audio                       # once per block, N times
  model: "seed_audio"
  voice_type: "<preset|element from list_voices>"
  voice_id: "<id from list_voices>"
  prompt: "<Block N line>"
  # optional fitting knobs: speech_rate (-50..100), loudness_rate (-50..100), pitch_rate (-12..12)
```

Never invent a voice id. Keep each take ≤ ~9.5s. Save every take's job id.

**Live cost, measured 2026-07-29:** 0.6 credits per block.

## Phase 6 — Assemble (mandatory, automatic — fixed blocks)

Run it the moment Phases 4–5 finish, without being asked. Call
**`explainer_video`** with the ordered blocks — it assembles **server-side** (no
local ffmpeg, no shell) and returns the final MP4.

Every block is a **fixed 10 seconds**: a shorter voice is centered, a slightly
longer one is sped up pitch-safely, the clip is never time-stretched. Total =
N × 10s, exact.

```
explainer_video
  params:
    width: 1280            # 720 if vertical
    height: 720            # 1280 if vertical
    subtitles: { font: "patrick" }   # ONLY when subtitles are ON; omit otherwise
    items:
      - { video: "<clip 1 job id>", audio: "<voice 1 job id>" }
      - { video: "<clip 2 job id>", audio: "<voice 2 job id>" }
      # …one entry per block, in play order…
```

Assembly itself is free; subtitles cost 0.05 credit per voiced block. Do **not**
put subtitle text into any prompt — the backend transcribes and burns them.

## Defaults & failure handling

- **Order is fixed** — Block N's audio on clip N; assemble in order 1→N.
- **Keep the style key on every generation.**
- **Take over ~9.5s** → raise `speech_rate`, shorten the line, or split the beat.
- **`voice_id` / `voice_type` required** → you skipped `list_voices`.
- **Two identical failures = wrong prompt, not bad luck.** Realistic render →
  strengthen the non-photoreal STYLE + NEGATIVE.
- **Never silently switch to a photoreal model.**
