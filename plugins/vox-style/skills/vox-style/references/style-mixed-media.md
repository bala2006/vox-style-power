# Style A — Editorial Mixed Media collage (DEFAULT)

Flat, bright, playful-editorial. The visual grammar of a Vox video: a
motion-designed magazine spread, never a filmed scene. No text in clips —
captions get burned at assembly.

**Use for:** data stories, "why X" explainers, shorts, anything without a
cinematic or investigative brief.

## The visual vocabulary

Every block combines two or three of these, chosen to literally illustrate that
block's narration line.

- **Archival cutouts** — photographic subjects (people, buildings, objects) cut
  out with rough white paper borders, drifting or snapping into place over flat
  backgrounds. Photos live *inside* the collage as elements; the frame as a whole
  is never live-action.
- **Flat color fields** — bold editorial backdrops: warm yellow, off-white paper,
  deep navy, coral red. One dominant color per block, consistent accent palette
  across the whole video.
- **Paper & print textures** — grain, halftone dots, newsprint, torn edges, tape
  strips, subtle drop shadows that sell the "cut and pasted" feel.
- **Hand-drawn annotations** — marker circles drawing themselves around a cutout,
  underlines sweeping in, arrows connecting elements, scribbled emphasis strokes.
  Abstract strokes only, never letters or words.
- **Abstract data graphics** — bar charts growing, line graphs drawing themselves
  upward, pie slices separating. Unlabeled: pure shape and motion, no numerals,
  no axis text.
- **Maps** — flat stylized maps with animated routes, pulsing location dots,
  regions filling with color.
- **Redaction & highlight blocks** — solid color bars sliding over areas,
  spotlight vignettes isolating one cutout while the rest dims.
- **Scale comparisons** — one object multiplying into rows, a small cutout next
  to a towering one, stacks growing.

## Motion vocabulary

Snappy and intentional: quick ease-out entrances, elements sliding and popping
into place with slight overshoot, slow deliberate camera push-ins during "listen
to this" beats, whip-pans or page-flips between ideas, parallax drift between
collage layers. Something should always be moving, but only one thing should be
*loud* at a time.

## STYLE KEY prompt

Generate at the target aspect ratio with the Higgsfield MCP's `generate_image`
tool — `{ model: "nano_banana_pro", prompt: "<below>", aspect_ratio: "9:16" }`:

```
Editorial mixed-media collage style swatch, Vox-documentary motion graphics
aesthetic: flat warm yellow and off-white paper background with halftone dot
texture, archival photo cutouts with rough white paper borders, torn paper
edges and tape strips, hand-drawn black marker circles and arrows, bold flat
color blocks in navy and coral, subtle paper grain and drop shadows.
Abstract composition only — no characters, no objects with faces, no letters,
no words, no numbers. Non-photorealistic, no live-action, no realism, no 3D
render.
```

On Higgsfield at 9:16 you do not need this: `resolve_explainer_preset` with
preset id `80e4dd7b-cd65-42d4-b191-b58d62558602` returns the key for free.

## STYLE tokens

Paste into every block prompt's STYLE REFERENCE line:

```
editorial mixed-media collage, archival photo cutouts with white paper
borders, flat bold color fields, halftone and paper grain textures,
hand-drawn marker annotations, snappy motion-graphics animation,
non-photorealistic, illustrated, not a photo, no live-action, no realism
```

The trailing `non-photorealistic, illustrated, not a photo, no live-action, no
realism` is mandatory on every STYLE descriptor. It is the single clause that
stops the engine drifting into live-action footage.

## Block prompt template

One per block, labeled, no timecodes:

```
Block {N}
STYLE REFERENCE: Match the attached style key EXACTLY — {STYLE tokens}.
SCENE: {the collage composition that illustrates this block's narration line:
which cutouts, which color field, which annotations/charts/maps}.
MOTION: {entrance choreography + camera move + what animates during the shot}.
AUDIO: {ambient bed + one or two paper/whoosh/tick SFX — no voice, no narration}.
NEGATIVE: readable text, letters, words, numbers, captions, subtitles,
watermark, logo, photorealism, live-action footage, 3D render, lip-sync,
talking characters, color drift.
```

The NEGATIVE line is fixed. Copy it verbatim into every block. The scene must
visualize the narration's *idea*, not depict someone saying it.

## Worked examples

Narration (Block 1): *"Every day, humans throw away enough food to feed two
billion people. And most of it never even reaches a plate."*

```
Block 1
STYLE REFERENCE: Match the attached style key EXACTLY — editorial mixed-media
collage, archival photo cutouts with white paper borders, flat bold color
fields, halftone and paper grain textures, hand-drawn marker annotations,
snappy motion-graphics animation, non-photorealistic, no live-action.
SCENE: A warm yellow paper background with halftone texture. Photo cutouts of
apples, bread loaves and a full dinner plate snap into a neat grid, then one
by one flip over and tumble downward off-frame into a torn-paper "bin" shape
at the bottom. A thick black marker circle draws itself around the last
remaining plate.
MOTION: Cutouts pop in with slight overshoot in quick succession; slow camera
push-in as they begin tumbling; the marker circle draws in one confident
stroke at the end.
AUDIO: Soft paper rustles and quick whoosh ticks as cutouts flip and fall,
low minimal ambient pulse underneath — no voice, no narration.
NEGATIVE: readable text, letters, words, numbers, captions, subtitles,
watermark, logo, photorealism, live-action footage, 3D render, lip-sync,
talking characters, color drift.
```

Narration (mid-video evidence block): *"In nineteen seventy, shipping one
container across the ocean cost ten times what it does today. Then the boxes
took over."*

```
Block 4
STYLE REFERENCE: Match the attached style key EXACTLY — editorial mixed-media
collage, archival photo cutouts with white paper borders, flat bold color
fields, halftone and paper grain textures, hand-drawn marker annotations,
snappy motion-graphics animation, non-photorealistic, no live-action.
SCENE: Deep navy background. A stylized flat world map slides up from the
bottom; a coral dotted route draws itself across the ocean between two
pulsing dots. An archival photo cutout of a cargo ship rides along the route
while an abstract bar chart on the right shrinks step by step, its tallest
bar collapsing to a stub. Torn-paper container shapes multiply into a
growing stack.
MOTION: Map slides in with ease-out; route line draws left to right; camera
drifts laterally following the ship; bars shrink with snappy steps; container
stack builds with rhythmic pops.
AUDIO: Low ambient hum, soft tick per bar step, gentle ocean-paper whoosh —
no voice, no narration.
NEGATIVE: readable text, letters, words, numbers, captions, subtitles,
watermark, logo, photorealism, live-action footage, 3D render, lip-sync,
talking characters, color drift.
```

## Script shape reference (6 blocks = 1 minute)

Topic: "Why food waste is a supply-chain story"

```
Block 1  Every day, humans throw away enough food to feed two billion
         people. And most of it never even reaches a plate.
Block 2  We blame picky eaters and overfull fridges. But the biggest losses
         happen long before you ever see the food.
Block 3  Nearly forty percent of waste in poorer countries happens at the
         farm, crops rotting while they wait for trucks that never come.
Block 4  Rich countries flipped the problem. Their food survives the journey,
         then dies in supermarkets chasing perfect-looking produce.
Block 5  Here's the twist: fixing trucks and fridges would cut more waste
         than every household campaign combined.
Block 6  So the fight against food waste isn't in your kitchen. It's in the
         boring machinery that moves dinner around the world.
```

The shape: cold-open stat → stakes → two evidence beats → the turn → kicker that
reframes Block 1. Each line is one idea, ~20–24 words, numbers spelled out, no
filler, no em dashes.
