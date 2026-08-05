<!-- VENDORED. Source: higgsfield-ai/skills @ 0.12.0 references/prompts.md, adapted to the MCP.
     Mirrored at skills/higgsfield-video-explainer/references/prompts.md.
     Check drift: get_workflow_bundle_file(workflow: "video-explainer", path: "references/prompts.md") -->

# Prompt templates

> Re-vendored from the Higgsfield MCP server:
> `get_workflow_bundle_file(workflow: "video-explainer", path: "references/prompts.md")`

All image/video generation prompts are in **English**. Only the spoken
narration switches to the user's language (default English).

Two things keep the film consistent: (1) build one **style key** image in
Phase 1 and attach it as the image reference to every clip; (2) paste the
same **STYLE descriptor** into every prompt. Narration is handled **per
block** — one plain line per 10-second clip, voiced separately — so each
block's audio lands on its clip with no timecodes and no drift.

---

## 0. STYLE descriptor (write once, reuse everywhere)

Render style + palette + line character + finish — and it must be
**non-photorealistic**. Always append the negation clause. Examples:

- `flat 2D vector animation, bold clean outlines, solid vibrant flat fills, no shading, no gradients`
- `hand-inked black-marker on off-white paper, solid jet-black fills, thin white scratch highlights, marker grain, strictly monochrome`
- `strict monochrome minimalism, black silhouettes on white void, high contrast, lots of negative space`
- `hand-painted storybook gouache, soft textures, warm muted palette, visible brush strokes`

Always end with: `non-photorealistic, illustrated, not a photo, no live-action, no realism`.

---

## 1. Style key (Phase 1 → `generate_image`, model `nano_banana_pro`)

Make **one** key image in the chosen aspect (`16:9` default, `9:16` for
vertical — the key's aspect ratio is what sets the video framing, since
`gemini_omni` inherits it). Keep its job id — it is the `medias` image
reference on every clip.

### A — no photos: abstract style swatch (default, locks style best)

```
Pure {STYLE} STYLE REFERENCE plate. No characters, no faces, no people, no
objects, no scene, no letters — an abstract style swatch only. A balanced
arrangement that demonstrates the rendering grammar clearly: {line quality},
{fill behavior}, {highlight/edge behavior}, {texture/grain}. {palette
constraint, with hex if strict}. High contrast, clean background, generous
negative space. Flat, raw, hand-illustrated, non-photorealistic. No text, no
logos, no watermark.
```

If `character` is ON, instead render the character in-style as the key:

```
{STYLE}. Full-body character: {HOST} — a {species/persona} narrator,
expressive, clear readable silhouette, looking at camera, centered, simple
background. Recurring-character design. No text, no logos, no watermark.
```

### B — reference_photos given (style only)

Import each photo (`media_import_url` for a web URL, or `media_upload` /
`media_upload_widget` for a local file), pass them all as `medias` (role
`image`), and use this **prefix verbatim**, then the user's request:

```
Make an Animated Explainer. Take only the visual render style and color
grading of the input image(s); mix the styles if there is more than one
image. Never use the characters, inscriptions, etc. from the input image(s)
unless the instructions below ask you to. Use only the render style, and
follow the user's instructions below:
{raw user query / scene}
```

The photos are style donors only — never copy their people, text or objects.

---

## 2. Block prompts (Phase 3 → `generate_video`, model `gemini_omni`, ×N)

One per block, labeled `Block N` (no timecodes). Attach the style key as
`medias: [{value:<key job id>, role:"image"}]`, `duration: 10`,
`resolution: "720p"` (only supported value). Use the **labeled block** format:

```
Block 1
STYLE REFERENCE: Match the attached reference image EXACTLY. Replicate its look precisely: {STYLE tokens}. Every element below rendered in that identical style.
SCENE: {scene + action for this block, matching what the narrator says over it}.
MOTION: {camera move + animation behavior — slow push-in, drift, scale shock, hard contrast cut}.
AUDIO: {ambient SFX / music only — NO voice, no dialogue, no narration}.
NEGATIVE: color drift, photorealism, 3D render, lip-sync, captions, on-screen text, watermark{, + style-specific bans}.
```

Rules:

- Paste the same `{STYLE}` tokens into every block's STYLE REFERENCE line.
- **AUDIO is diegetic only** — sound design or music, never speech. The
  characters do not talk; no lip-sync. Voice is added per block in post.
- Character ON: Block 1 = character greets by gesture (mouth closed); the
  last block = waves a sign-off; middle blocks = scenes (cameo ok, never
  talking). Character OFF: every block is a stylistic scene of its beat.
- One clear action per block.

Worked example (strict monochrome minimalism, character OFF):

```
Block 4
STYLE REFERENCE: Match the attached reference image EXACTLY. Replicate its look precisely: strict monochrome minimalism, solid black silhouettes on an absolute white void, high contrast, lots of negative space, matte. Every element below rendered in that identical style.
SCENE: A lone black silhouette figure slowly dissolves at the edges, crumbling into fine drifting sand that scatters into the white emptiness.
MOTION: Very slow push-in, the figure erodes grain by grain, particles drift sideways.
AUDIO: low sustained drone, a soft whisper of falling sand — no voice.
NEGATIVE: color, gray midtones, photorealism, 3D render, lip-sync, captions, on-screen text, watermark.
```

---

## 3. Narration (Phase 2 → voiced per block with Seed Audio in Phase 5)

Write **N blocks**, one per clip, labeled `Block N`. Each block is one plain
line **sized to land ~8–9 seconds** of speech (it sits centered in the 10s
clip with a small pad each side). Starting point ~20–24 words; nudge with
`speech_rate` if a take runs long or short. No timecodes.

- **Plain spoken text only — NO emotion cues, NO parentheticals, NO stage
  directions.** (Seed Audio takes performance from `speech_rate` /
  `loudness_rate` / `pitch_rate`, not from words in brackets.)
- **Spell numbers out** — "twenty percent", "nineteen fifty-eight".
- **Tone** comes from word choice; concrete; no "in this video".

```
Block 1
For four and a half thousand years, the pyramids of Egypt have stood against the desert, silent and immense.
Block 2
They rose along the Nile, the river that fed a whole civilization ruled by pharaohs believed to be living gods.
Block 3
Every pyramid was a tomb, a launch pad for the king's soul into the afterlife, and a monument meant to last forever.
```

### Content modes

- **Topic** → vivid explainer: hook, build understanding block by block, end
  on the payoff. Present-focused, concrete, no filler.
- **Personal / philosophical story** → the **user (or their narrator persona)
  is the protagonist**. Recast the story into a narrated arc; keep their
  details, invent nothing factual.
