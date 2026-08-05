# Style C — Aged-newsprint newsroom collage

Documentary cutout-collage on aged archival paper: halftone black-and-white
cutout people with rough white keylines and offset red strokes, giant stat
numbers treated as characters, one hot red accent plus mustard secondary,
print grain everywhere. Layers sit at distinct depths like a paper diorama.

**Use when** the brief says newsprint, newsroom, archival, "the AI bubble
video", or when the story is finance / markets / data-heavy.

**The style sheet ships with this skill:** `assets/newsroom-style-sheet.png`.
Attach it as the style key on every clip. The prompt that produced it is in
`assets/newsroom-style-sheet-prompt.txt` if you ever need to regenerate it.

Palette baked into the sheet: Archival Tan `#C9BB9C`, Ink Black `#1A1A1A`,
Halftone Gray `#8C8C8C`, Hot Red `#D62E1F`, Mustard `#D9A441`. Red is reserved
for strokes, underlines, and arrows. Mustard is a secondary accent only.

## STYLE tokens

Paste this identical descriptor into every block's `STYLE REFERENCE:` line. It is
the short form of the style blocks below, formatted for the block template in
`references/workflow-prompts.md`:

```
aged-newsprint documentary collage, desaturated archival palette with one hot
red accent and mustard secondary, condensed bold headline caps with giant stat
numbers, halftone black-and-white cutout people with rough white keylines and
offset red strokes, torn-paper edges, print grain and halftone dot texture,
layers at distinct depths like a paper diorama, spring pop-ups with overshoot
and ticking counters, non-photorealistic, illustrated, not a photo,
no live-action, no realism
```

The trailing `non-photorealistic, illustrated, not a photo, no live-action, no
realism` is mandatory on every block.

The rest of this file is the full authoring system. Every prompt is four blocks in
fixed order: **STYLE BLOCK → SHOT → AUDIO → AVOID**.

---

## 1. Choose a style block (per clip, not per video)

The choice is per clip. A restrained data beat wants Flat Parallax; a big reveal
wants Deep Diorama. Use verbatim once chosen.

### A. Flat Parallax (documentary, restrained)

> Use the attached style sheet as the strict visual system — match its aged-newsprint collage surface, desaturated archival palette with one hot accent, condensed headline caps with giant stat numbers, halftone black-and-white cutout people with rough white keylines and offset accent strokes, and its print-grain finish. Do NOT copy the sheet's layout; it defines the language, not the composition. Layers sit at distinct depths like a paper diorama — true parallax, never glossy 3D. Backgrounds are muted archival fields, varying per clip within this palette. ALERT WASH means the whole frame floods toward the hot accent tone. Motion: spring pop-ups with overshoot, staggered entrances, ticking counters, underline swipes; one slow camera move per clip. Audio: sound design only — paper pops, thwips, stamps, ticks, low newsroom hum. No music. No voice-over.

### B. Deep Diorama (cinematic, camera-as-actor)

> Use the attached style sheet for materials only — aged-print collage textures, halftone black-and-white cutout people with rough keylines and offset accent strokes, giant stat numbers, print grain. Do NOT copy the sheet's layout or its flatness: every clip is a deep 3D paper diorama — cutouts are physical layers separated in real space, strong shallow depth of field, foreground elements crossing close to the lens. The camera is an actor: it flies between layers, orbits, dives, whips, racks focus — one committed cinematic move per clip. Backgrounds change per clip, always within the sheet's palette. ALERT WASH means the entire frame floods to the hot accent tone in one beat. Motion: springs with overshoot, staggered entrances, ticking counters. Audio: sound design only — paper pops, whooshes, stamps, ticks. No music. No voice-over.

### C. Locked Stage (self-describing, no sheet attached)

> Documentary cutout-collage stage: a locked, muted archival map/texture background that never changes. Midground: black-and-white halftone cutouts with a rough white keyline and an offset red marker stroke behind each. Foreground: structures, props, and big stat numbers in full color. Condensed bold headline caps; numbers rendered huge, as characters. Desaturated palette plus one hot red accent, secondary mustard. Spring pop-ups with slight overshoot, staggered entrances, counters ticking up, red underline swipes. Camera: subtle slow drift only, never cuts.

Swap the background clause when the shot needs it, e.g. *"a flat city-skyline
silhouette cutout against a muted dusk-toned archival sky, print-grain texture,
locked for this shot."*

### Why each clause exists (do not delete these)

| Clause | Job |
|---|---|
| "style sheet for materials only" | Borrow texture, not layout |
| "Do NOT copy the sheet's layout or its flatness" | Kills the #1 failure mode: flat 2D output |
| "deep 3D paper diorama / physical layers in real space" | Forces parallax and depth |
| "shallow depth of field / foreground crossing the lens" | Sells the 3D lie |
| "camera is an actor / one committed move" | Prevents mushy multi-move drift |
| "Backgrounds change per clip" | Stops every shot looking identical |
| "ALERT WASH" | Defines a reusable named beat |
| "springs with overshoot, staggered, ticking" | Motion signature |
| "sound design only, no music, no VO" | Audio lock |

---

## 2. Write the SHOT

One sentence-block containing five beats, in roughly this order:

| Beat | Function | Examples |
|---|---|---|
| **Background** | Sets the depth field | "a faded world map tilted in perspective, far out of focus" · "stacked newspaper front pages receding in deep perspective" · "a collage field of ledger sheets and ticker strips at depth" |
| **MG** | The subject cutouts | "cutouts of three tech executives work one large hand-pump" · "an iceberg cutout floats with only its tip above a paper waterline" |
| **FG** | The data element | "a counter ticks up to `$1.2T` (giant number)" · "a red stat number reads `POWER DEMAND ↑`" |
| **Camera** | ONE committed move | dive through · orbit quarter turn · whip ×3 · lateral track · climb alongside · push-in · ride the loop like a rail |
| **Settle** | Where the clip ends | "Settle deep, looking up at the tip far above." · "Settle on the sliver in macro." · "Settle mid-orbit." |

### Rules

- **One camera move per clip.** Never two. Never a cut.
- **Always end on "Settle on…"** — non-negotiable, it tells the model where to
  park the final frame.
- **Tag every text element** with its type in parens: `(headline)`, `(label)`,
  `(counter)`, `(giant number)`.
- **Always name at least two depths.** If depth isn't stated, the model flattens it.
- **Stagger everything.** Nothing enters simultaneously.
- **Logos must be "attached… flat, unmodified"** — never described, never invented.
- **Numbers are giant.** Stats are set dressing, not captions.
- **Change the background every clip.** Same palette, new surface.
- **Present tense, active verbs.** "snap in", "draws", "races", "whips".
- **No stage-direction tags, no shot numbers, no timecodes.**

### Slot menus

**Background** — pick one, out of focus, tilted in perspective:
faded world map · torn ledger page · newspaper column wall · blueprint grid ·
stock chart engraving · passport stamp field · circuit trace print · topographic
map · index-card wall · shipping manifest

**Foreground elements:**
cards · torn strips · logo plates · giant stat number · halftone cutout person ·
coin chips · arrows · stamps · pins with thread · folder tabs · ticker tape

**Depth cue (mandatory):**
"at three different depths" · "one near the lens, two deep" · "stacked receding
into the frame" · "the nearest whipping past the lens with motion blur"

**Camera move library:**
`push-in` · `slow drift lateral` · `dive through a layer` · `orbit quarter turn` ·
`whip ×2–3, each landing hard` · `fast lateral track then hard stop with
overshoot` · `climb alongside a rising element` · `fly low between columns` ·
`ride a path like a rail` · `macro slide along an object, rack focus tip→subject`

**Settle:**
mid-orbit · on the number · on the closing loop · on the cutout's face · wide on
the full diorama

### Escalation devices

- **ALERT WASH** — frame floods to hot accent. One per video, save it for the
  single biggest beat.
- **Freeze before contact** — "everything freezes one millimeter before contact."
- **Counter slam** — a number flies at the lens and snaps into razor focus while
  everything blurs.
- **Accelerating loop** — same geometry, each lap faster.

### Named beats (reusable vocabulary)

- **ALERT WASH** — entire frame floods to the hot accent tone in one beat
- **STAMP** — an approval/rejection stamp slams in at foreground depth, dust puff
- **TICK-UP** — a giant number counts up with overshoot then settles
- **TEAR** — a paper layer rips to reveal the layer behind it
- **THREAD PULL** — pins and red thread draw a connection between two cutouts

Define new beats in ALL CAPS in the style block once, then call them by name in
the SHOT.

---

## 3. Write the AUDIO

Format: `AUDIO: [2–3 sounds, comma separated] — sound design only, no music, no
narration.`

Sound mirrors the camera move:

| Move | Sound |
|---|---|
| Dive | submerge whoosh, deep pressure hum |
| Whips | three whip whooshes, pops landing each hit |
| Track + stall | track rumble, stall click, drain hiss |
| Contact / wash | rising air riser, deep sub thud on contact |
| Loop | accelerating ticks, whoosh per lap |
| Tension hold | rubber creak, room tone falling to near silence |

Bed options: `low newsroom hum` · `low hum` · `room tone`.

---

## 4. Write the AVOID

Use the block matching your style choice, verbatim.

**For Flat Parallax (A) and Locked Stage (C):**

> AVOID: no glossy CG 3D, no lens flares, no camera cuts within the clip, no full-color midground portraits (people stay halftone black-and-white), no warped or gibberish text, no invented logos, no watermarks, no simultaneous entrances, no music, no soundtrack, no voice-over, no narration, no lyrics

**For Deep Diorama (B):**

> AVOID: no flat single-plane composition, no static locked-off camera, no glossy plastic CG (depth stays papercraft), no full-color midground portraits (people stay halftone black-and-white), no warped or gibberish text, no invented logos, no watermarks, no music, no soundtrack, no voice-over, no narration, no lyrics

Add `no UI or glass elements` when the shot involves screens, dashboards, or tech.

---

## 5. Fill-in template

```
[STYLE BLOCK A / B / C — verbatim]
SHOT:
Background: [depth field, often out of focus].
MG: [subject cutouts, staggered entrance].
FG: [counter / stat number / label] reading "[TEXT]" ([type tag]).
[Camera: ONE committed move, describing what crosses the lens and what racks focus].
Settle [final frame].
AUDIO: [sound 1], [sound 2], [sound 3] — sound design only, no music, no narration.
AVOID: [matching AVOID block]
```

## 6. Reference examples

**SHOT:** Background: a faded world map tilted in perspective, far out of focus.
FG: three cards snap in at different depths forming a triangle, each carrying one
attached logo, flat, unmodified. A thick arrow draws card-to-card into a closed
loop; coin chips race along it, the nearest whipping past the lens with motion
blur. Camera orbits the triangle a quarter turn, focus racking card to card.
Settle mid-orbit.

**SHOT:** Background: a torn ledger page tilted away, deep out of focus. FG: a
giant stat number 47% drops in close to the lens, halftone cutout of a worker
standing small behind it. Counter ticks up from 12% with overshoot; torn strips
flutter past at foreground depth. Camera pushes in through the gap beside the
number, focus racking from strips to the cutout's face. Settle on the number.

**SHOT:** Background: a newspaper column wall, receding, fully soft. FG: six
index cards stacked at staggered depths, red thread pinned between three of them.
THREAD PULL snaps the connection taut, dust lifting off the paper. ALERT WASH on
the snap. Camera whips left to right past the near cards, focus racking front to
back. Settle wide on the full diorama.

---

## 7. Sequencing a video

- **Choose the style block per clip.** Flat Parallax for restrained data moments,
  Deep Diorama for reveals and escalation, Locked Stage when no sheet is
  attached. The materials stay constant, so the world holds even when the depth
  treatment shifts.
- **Use the shift as a tool.** Dropping from Deep Diorama into Flat Parallax
  reads as a breath; jumping the other way reads as a lift.
- **Vary the background per clip**, always inside the palette.
- **Vary the camera move per clip.** Never two dives in a row.
- **Chain clips** by reusing geometry: build the loop, then ride the loop, then
  blow past it. Reference it explicitly: *"The triangle loop from the previous
  clip runs faster each lap."*
- **Reserve ALERT WASH** for one clip per video.
- **End on a held tension frame**, not a resolve: the frozen pin, the trembling
  summit, the wobbling slab.

## 8. Per-clip checklist

- [ ] Style block pasted verbatim, unedited
- [ ] Background named, tilted, out of focus, different from the previous clip
- [ ] At least two depths explicitly stated
- [ ] Exactly one camera move
- [ ] Focus behaviour described
- [ ] Settle stated
- [ ] AUDIO line mirrors the camera move
- [ ] Matching AVOID block pasted verbatim
