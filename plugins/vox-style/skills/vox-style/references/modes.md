# Modes B–F

Read this file when the wizard's **Q1** lands on C, D or E, when **Q4** asks for
a custom look (mode B), or when **Q2** picks a backend other than Higgsfield
(mode F). Mode A, the default explainer, lives entirely in `SKILL.md` and does
not need this file.

All modes inherit `SKILL.md`'s non-negotiables without exception: one
approval gate, no credit spent before it, two sources for every number, the style
key on every clip, assemble in the same run, no em dashes. Where a mode below
reaches the gate, it uses the same gate format.

## Each mode has its own wizard

Every mode below opens with a fixed question set, walked exactly like mode A's:
**one question per screen, one `AskUserQuestion` each, first option Recommended
and pre-selected, four options maximum.** Anything the request already said
becomes that question's pre-selected first option — it is never a reason to skip
the question. All of it is free.

Each mode carries its own `N`, so the header counts against that mode:

```
🎬 VOX · news radar
Q2/3  ▓▓▓▓▓░░  67%     niche ✓ · window …
```

Line 1 names the mode. Filled cells are `round(7 × n / N)`, percent is
`round(100 × n / N)`. Answered questions get `✓`, the current one `…`, unasked
ones are left off.

The wizard replaces the "ask only for what is missing" instructions these modes
used to carry. Ask the whole set, every run.

---

## Mode B — Build a permanent style key

**When:** Eric wants a look the three house styles do not cover — a new series, a
client brand, his own colors.

**Why it is not just `generate_image`:** the point is a key that survives hundreds
of clips. That takes a proposal step Eric can steer before anything costs money,
and a style bible written down so the look is reproducible after this session is
gone.

### The wizard — 4 questions

| # | Header | Question | Options, first is Recommended |
|---|---|---|---|
| 1 | `Name` | What should this style be called? | A slug from the request or topic area · *the series name if there is one* · *the brand name if there is one* — free text is the usual answer here |
| 2 | `Feeling` | How should it feel? | **Bright and playful editorial** · Dark and cinematic · Warm and archival · Neon and technical |
| 3 | `Colors` | Which palette? | **You choose** (I'll pick three or four that fit the feeling) · Brand hex codes · Describe it in words |
| 4 | `Props` | What recurring objects? | **You choose from the topic area** · List them yourself · Match one of the three house styles' vocabulary |

Q1's answer becomes the `styles/<name>.png` and `styles/<name>.md` filename, so
keep it a slug. Q4 is asking for the six to eight cut-outs that go on the key.

### Procedure

1. **The four wizard answers are the brief.** Name, feeling, colors and props
   are already collected. Do not re-ask any of them, and do not go looking for a
   fifth input — if something is genuinely missing, it belongs in the one
   clarifier, not in a second round of questions.

2. **Propose three directions in words. Generate nothing yet.** For each: the
   background material, the palette in three to four named colors, the texture,
   and one line on why it fits. Number them and stop. This step is free and it is
   what stops Eric paying for a look he was never going to keep.

3. **Generate the key.** `generate_image`, model `nano_banana_pro`, at
   `VOX_DEFAULT_ASPECT`. Compose it as a flat-lay reference sheet photographed
   from directly above, containing six to eight recurring props as cut-outs on
   the background material. **Do not add a palette swatch strip** — see the
   warning below.
   **No text and no watermark anywhere in the image** — a key with lettering in
   it teaches every downstream clip to render lettering.

   **And no palette swatch either.** A swatch strip reads to you as an
   annotation; it reads to the video model as a physical prop, and it will turn
   up as a coloured card sitting in your scenes. Verified on a real run,
   2026-07-30: a small emerald swatch added to a key leaked into blocks whose
   only accent was meant to be burnt-orange, and **no negative prompt could
   remove it** — banning "green, emerald, teal, jade" tripled the green instead.
   Prompt text cannot delete what the reference image supplies. Put the palette
   in the style bible `.md`, where clips never see it.

   The bundled `assets/newsroom-style-sheet-prompt.txt` is the worked example of
   this prompt shape. Follow its structure.

4. **Show it. Revise on request without defending it.** When Eric approves, save
   the image under `PROJECT_ROOT/styles/<name>.png`, keep the `media_id`, and
   report both the path and the job id.

5. **Write the style bible** to `PROJECT_ROOT/styles/<name>.md`: background
   material, palette hex codes, texture rules, lighting, camera behavior, the
   STYLE tokens to paste into every storyboard block, and the negative prompt.
   This file is the deliverable that outlives the session. Format it like the
   three bundled style files so it drops into the same slot.

6. **Prove it holds under animation.** Generate ONE ten-second test clip with the
   key attached, aspect passed explicitly, on a simple scene from Eric's topic
   area. Pull three frames and show him. A key that looks right as a still and
   drifts under motion is a key that will ruin a whole batch.

7. **Register it.** Tell Eric to put the `media_id` in `.env` as
   `VOX_STYLE_KEY_ID`, and note the new style file so future runs can name it.

**Cost:** one image, plus one 10s clip for the proof. Quote it at the gate.

**Rules that make a key reusable:** generic enough to cover any story in the
topic area, specific enough that palette and texture are unmistakable. Nothing
trendy that dates in six months. No faces, no logos, no real brands.

---

## Mode C — News radar

**When:** Eric wants to publish and has no topic, and wants to *choose* rather
than be handed one.

**Difference from mode A's no-topic path:** Phase T picks a topic and names one
runner-up. Mode C scores three candidates against four explicit tests and stops.
Use mode C when Eric asks to be pitched; use Phase T when he just wants a video.

### The wizard — 3 questions

| # | Header | Question | Options, first is Recommended |
|---|---|---|---|
| 1 | `Niche` | Where should I look? | **AI** · Tech · Money · *free text for anything else* |
| 2 | `Window` | How fresh? | **This week** · Today only · This month |
| 3 | `How many` | How many candidates? | **Three** · Five |

A niche named in the request pre-selects it. Q2 sets the scan window in step 1
below; Q3 sets how many pitches step 2 returns, and the six-line format holds
whichever number is chosen.

### The four tests

A story is explainable in sixty seconds only if **all four** hold. Reject on any
one failure, however big the headline:

1. **One hard number** that is genuinely surprising.
2. **A twist** — the obvious interpretation is wrong.
3. **Shootable with objects**, not talking heads.
4. **It touches the audience's money, safety or work.**

### Procedure

1. **Scan** the Q2 window in the Q1 niche. Search three or four angles, not one.
   Skip breaking tragedies, active disasters, celebrity gossip with no data
   angle, and anything with only one source.

2. **Pitch exactly the number from Q3.** Six lines each, no more: headline in plain words, the
   surprising number, the twist in one sentence, the through-line object you
   would use, and a score out of ten. Rank them, say which you would pick and
   why. **Then stop and wait.** This is a real stop, not a rhetorical one.

3. **Verify the winner before building.** Cross-check every fact against two
   independent, named sources. **If the central number does not hold up, say so
   immediately and offer the runner-up.** Do not build on a shaky fact and do not
   quietly soften it — a fabricated-feeling number in a video that looks this
   credible costs more than the episode is worth.

4. **Hand off to mode A.** Enter Phase R with the verified brief already in hand:
   topic, angle, hook number with both sources, twist, through-line object. Do
   not re-research what you just verified.

5. **Deliver the MP4 and the source list.** Nothing else. No titles, no caption,
   no hashtags — the source list is evidence, not packaging.

The pitch step is free. Only the mode-A run that follows costs credits.

---

## Mode D — Explain Eric's own business

**When:** the subject is Eric's product, offer or service rather than a news
story.

**What changes:** there are no outside sources to verify against, so the
discipline moves. Every number in the script must come **from Eric**. Never
invent a result, a timeframe, or a testimonial, and never soften an absent number
into a vague claim that implies one.

### The wizard — 4 questions

| # | Header | Question | Options, first is Recommended |
|---|---|---|---|
| 1 | `Offer` | Which offer is this about? | *the product named in the request* · *anything already in `.env` or a past run* · free text |
| 2 | `Audience` | Who is it for? | *the obvious segment from Q1* · free text — be specific, "creators" is not an audience |
| 3 | `Pain` | What does it remove? | *the pain implied by Q1* · Let me describe it · **I'll tell you in their words** |
| 4 | `CTA` | What should they do? | **Visit the link** · Book a call · Reply or DM · free text |

These four replace the old six-input collection. What is not asked — what he
delivers, and the proof — comes out of step 2's story hunt, because both need
the problem framed first to be worth anything.

### Procedure

1. **The four wizard answers are the brief.** Offer, audience, pain and CTA are
   collected. Do not re-ask them.

2. **Find the story before writing a word.** Explainers sell because they explain
   a **problem**, not a product. Report back in five lines: the real, specific,
   expensive problem the customer lives with, why the usual solutions fail them,
   and the one surprising truth that reframes it. **If the four answers are still
   too vague to build on, spend the one clarifier here** and wait, rather than
   generating filler. One question, the sharpest one available — not three.

3. **Script**, N blocks of 20–24 words, same craft rules as Phase S:

   | Block | Job |
   |---|---|
   | 1 | The problem at its most painful, with a real number if there is one |
   | 2 | What it costs to keep living with it |
   | 3 | The reframe — the surprising truth |
   | 4 | How the fix actually works, plain language, no feature list |
   | 5 | Proof, using only Eric's numbers |
   | N | The call to action, one clear instruction |

   **Banned words:** solution, innovative, seamless, leverage, revolutionize.
   The house tone still holds — the narrator explains, never hypes. A sales voice
   on a faceless format reads as an ad, and ads get scrolled.

4. **Through-line object, transforming.** Same rule as mode A, but the object
   represents the customer's problem and physically changes across the blocks:
   tangled to straight, heavy to light, scattered to stacked, closed to open.

5. **Style key in Eric's brand colors.** Either mode B, or the flat-lay prompt
   from the chosen style file with the palette swapped for his colors.

6. **Gate, then build** exactly as mode A. Same phases 1–6, same verify.

7. **Deliver both aspects**, per the dual-aspect rule in `SKILL.md`: native 16:9,
   then the free center-cropped 9:16. Stop at the MP4s — no captions, no titles.

---

## Mode E — Stand up a series

**When:** Eric wants a channel, not another one-off.

**What it produces:** four artifacts plus episode one. Everything lands in
`PROJECT_ROOT/series/<name>/`.

### The wizard — 5 questions

| # | Header | Question | Options, first is Recommended |
|---|---|---|---|
| 1 | `Premise` | What does every episode promise? | *the premise from the request* · free text — one sentence, and it has to name the ONE question each episode answers |
| 2 | `Episodes` | How many in the slate? | **Eight** · Four · Twelve · Thirty |
| 3 | `Cadence` | How often do they ship? | **Weekly** · Twice a week · Daily |
| 4 | `Look` | Which house style? | **newsroom** · mixed-media · diorama · Build me a custom one → mode B |
| 5 | `Length` | How long is an episode? | **1 minute** · 30 seconds · 3 minutes · 5 minutes |

Q4 and Q5 are mode A's Q3 and Q4 verbatim, because the series locks them once
and every episode inherits them. Q2 sets how many entries `slate.md` carries; Q3
goes into the bible as a shipping rule, not a schedule anyone automates.

Aspect, voice and engine are **not** asked here. Episode one is a full mode-A run
and asks them there, then the bible records what was chosen so episodes two
onward stop asking.

### Procedure

1. **The bible** → `bible.md`. One page, plain text:
   - The series name and what it promises, in one sentence.
   - The ONE question every episode answers.
   - Visual rules that never change: background, palette, texture, camera
     behavior, negative prompt. Point at the style file rather than restating it.
   - Narration rules: voice id and type, pace, target seconds per block, words
     per line.
   - Structural rules: N blocks, hook, escalation, turn, meaning, one
     through-line object.
   - **The three things allowed to change episode to episode.** Naming these is
     what stops drift — everything unlisted is fixed.

2. **The bookends** → described in `bible.md` precisely enough to regenerate
   identically forever. A two-second title treatment and a three-second end card.
   Consistent bookends are the cheapest way to feel like a real show. Generate
   them once, save the job ids, and reuse the same clips every episode rather
   than re-rendering.

3. **The slate** → `slate.md`. Search what is actually happening in the niche now
   and pitch the requested number of episodes. For each: working title, the
   surprising number it hangs on, the twist, the through-line object, a score out
   of ten. Rank by expected performance and mark which goes first and why.
   **Kill any idea with no hard number or no twist, and say which you killed.**
   Apply mode C's four tests here — the slate is a batch radar run.

4. **The checklist** → `checklist.md`. Numbered, with the exact settings that
   worked, so Eric or an assistant can run an episode without thinking. Include
   the failure points and the fix for each: style drift, duplicated text in
   clips, narration running long, silence at the head of a take, clips returning
   in the wrong aspect, jobs that hang. Lift the specifics from `SKILL.md`'s
   failure-handling section rather than inventing new ones.

5. **Episode one** → a full mode-A run on the top-ranked slate entry, using the
   bible. Output goes to the normal `output/<slug>/` folder; the series folder
   holds only the reusable artifacts.

**Gate once, for everything.** Bible, bookends, slate and checklist are all free
— research and writing. Show them together with the episode-one script and one
credit estimate, then stop. Do not gate four separate times.

**Repeat runs get cheap.** The style key, the bookends and the voice id are all
paid for after episode one. Episode two costs clips plus voice only.


---

## Mode F — build it by hand in Google Flow

**When:** Q2 picked *Google Flow, manual* or *I already have the clips*.

**What it is NOT:** a different kind of video. Topic, research, style,
through-line, script and storyboard are mode A's, unchanged, and the gate is the
same gate. Mode F replaces exactly one thing — who generates the clips — and adds
the local assembly that follows.

**Why it exists:** it costs **zero Higgsfield credits**, it reaches engines the
MCP does not expose, and it is the honest answer when the balance cannot cover
the run. Used on two consecutive real runs before it was written down, which is
the whole reason it is written down now.

### What changes, and only this

| Phase | Mode A | Mode F |
|---|---|---|
| T, R, A, S, B | identical | identical |
| GATE | credits quoted from `get_cost` | quote the **Flow** credit table, and say Higgsfield spend is zero |
| 1 Style key | `resolve_explainer_preset` or `generate_image` | none. Flow has no style key: every prompt is self-describing |
| 2–3 Voice | `generate_audio` | ElevenLabs API direct, `scripts/elevenlabs-voice.py` |
| 4 Clips | `generate_video` | **Eric generates by hand**, then drops them in `clips/` |
| 5 Assemble | `explainer_video` | `scripts/build-ad.py`, local ffmpeg |
| 6 Sound bed | `restore-sound-bed.py` | already handled inside `build-ad.py` |

### The three scripts are templates, not a library

`scripts/make-prompts.py`, `scripts/elevenlabs-voice.py` and
`scripts/build-ad.py` are **copied into the run folder and edited there**, never
run from the skill. Each carries a banner naming exactly what changes per run and
what carries over. The machinery that carries over is the value: the guards, the
per-clip bed normalisation, the ducking, the word-level caption renderer.

```bash
cp <skill>/scripts/{make-prompts,elevenlabs-voice,build-ad}.py output/<slug>/
```

### Procedure

1. **Walk mode A to the end of Phase B.** Nothing is different yet.

2. **Write the prompts twice over.** `storyboard-flow.md` is the source and keeps
   the `<STYLE TOKENS>` and `<CHARACTER>` placeholders, written once each.
   `prompts-flow.txt` is generated from it with `scripts/make-prompts.py`, fully
   expanded, nothing to substitute, ready to paste. **Never hand-edit the
   generated file** — edit the source and regenerate, or the two drift and the
   whole point of a single style block is lost.

3. **Ingredients first, and look at them.** Flow's equivalent of a style key is
   an *ingredient*: one image attached to every clip. Generate one per recurring
   subject — the character, and the through-line object — **before** any clip.
   This is the only moment where fixing a face costs one generation instead of
   one per clip.

   **An ingredient is one subject, one shot, plain background.** Not a three-view
   character sheet: a multi-panel image gets read as several characters or as a
   layout to copy, and the panels turn up in the shot. A sheet is for a human to
   judge; an ingredient is for the model.

4. **Chain end-frame to start-frame at the junctions that would betray a drift**,
   and only there. Export the last frame of a clip and pass it as the first frame
   of the next. Everywhere else it is a needless constraint on the shot's opening.

5. **Gate, then Eric generates.** Hand over `prompts-flow.txt` with the tier and
   the ingredients named per clip. Then wait: nothing else can proceed.

6. **Voice before clips still holds.** Take durations drive the cut, so synthesize
   first and re-solve the timing on the measured seconds.

7. **Measure the beats, then cut.** Phase 4b in `SKILL.md`, and it is not
   optional here — a hand-generated clip is even less likely to put its impacts
   where the storyboard said.

8. **Assemble, verify, deliver** exactly as mode A.

### The credit table is a different one

Flow's roster is not Veo-only — Omni runs there too — and it moves. Read what the
account offers at run time instead of trusting this table, which records only
what has been verified:

| Tier | Cost (Flow, Ultra) | Reference images | Verified |
|---|---|---|---|
| Veo 3.1 Lite | 5 | yes, weaker | 2026-08-05 |
| **Veo 3.1 Fast** | **10** | **yes** | 2026-08-05 |
| Veo 3.1 Quality | 100 | **no** | 2026-08-05 |
| Omni | *unknown* | *unknown* | — ask before quoting |

**Pick the tier by reference support, not by price. Veo Quality cannot take
ingredients**, so it cannot hold a character or a product across clips. Never spend it on "the hero shot": that buys the one clip
with no reference attached, which is exactly where drift shows. Everything on
Fast, ingredients on every clip, and re-roll rather than escalate — ten Fast
re-rolls cost less than one Quality generation and every one of them keeps the
character.

Quote base + re-rolls at the gate, not base alone. Budget **one re-roll for every
two or three clips that carry a face**; that is normal, not failure.

### Cuts come from editing, not from generating

Five clips carry twelve visible shots because each clip holds two or three hard
impacts, and an impact is a cut point. A punch-in at 1.2× on the second half of a
clip reads as a new angle and costs nothing. This is what keeps a hand-built film
inside a sane budget.

**Time must stay monotonic inside a clip.** Re-using the same source seconds
twice makes the picture visibly rewind on any continuously moving camera. Stretch
with a speed ramp, never with an overlap. `build-ad.py` refuses to build
otherwise.

### The three guards in `build-ad.py`, and why each exists

They are the deliverable as much as the MP4 is.

1. **Total picture must equal total narration**, within 0.15s. Re-voicing without
   re-solving the cut is then impossible by accident — and it happens, because a
   narrator preset changes every block length.
2. **Monotonic time per clip**, above.
3. **`SYNC_CHECKS`** — a list of *(phrase, expected shot)*. The build fails if the
   shot carrying a prop is not on screen when the narration names it. A number
   shown under a different number's sentence is a factual misread, not a timing
   nit, and it has shipped before. On the run that introduced the check it caught
   two real defects: a price tag landing under the wrong clause, and a discount
   card drifting onto the price sentence.
