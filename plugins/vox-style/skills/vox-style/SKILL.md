---
name: vox-style
description: Produce a complete narrated Vox-style motion-graphics explainer video end to end on the Higgsfield MCP, plus the four jobs around it — build a permanent custom style key, scan the news for today's most explainable story, explain the user's own business, or stand up a whole series with a bible and an episode slate. Researches the topic, writes the script and storyboard, shows everything with a credit estimate at one approval gate, then generates the style key, voiceover, clips, and one assembled MP4. Accepts a topic, a Google Trends term, an article URL, or nothing at all. Three locked house styles. Use when the user says "/vox-style", "/vox", "vox video", "vox-style video", "motion graphics explainer", "animated explainer", "make a video about X", "make a video about this article", "make a video about what is trending", "make me a faceless video", "run the vox pipeline", "build me a style key", "find me a story to make a video about", "make a video about my business", or "turn this into a series".
---

# Vox-Style — one command to a finished explainer video

Turn a topic, a trend, an article, or nothing at all into a finished narrated
motion-graphics explainer. You approve once; everything else is automatic.

Six modes ship in this skill. **Mode A is the default and the reason the skill
exists**; the others are the jobs that surround it. The wizard's first question
picks the mode, and its second picks who generates the clips.

**Backend: the Higgsfield MCP server, or a manual build in Google Flow.** Q2 of
the wizard decides, and it decides early because it changes the engine list, the
cost model and who presses the button. On the default path every generation call
below is an `mcp__Higgsfield__*` tool: there is no `higgsfield` CLI, nothing to
install, and no ffmpeg dependency, because assembly runs server-side. The one
prerequisite is that the Higgsfield MCP is connected to this session.

On the **Flow path** — mode F in `references/modes.md` — nothing is generated
here at all: this skill writes the prompts and the cut plan, you generate the
clips by hand, and the film is assembled locally with ffmpeg for zero Higgsfield
credits. Everything before generation is identical, and the phases below still
apply verbatim up to the gate.

Connecting the MCP, for the default path: in the git-repo layout `.mcp.json`
declares it for the project; as an uploaded skill, connect it once yourself
(Cowork: Settings → Connectors; Claude Code:
`claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp`,
then `/mcp` to authenticate).

**This skill is a front end for `higgsfield-video-explainer`**, the official
Higgsfield workflow vendored at `references/`. That file
owns every tool call and the assembly contract. **Read it before Phase 1** and
follow it exactly. Vox-style adds five things on top:

1. Input handling: a Google Trends term, an article URL, or no topic at all.
2. Locked house styles instead of a preset gallery to browse.
3. **The wizard** — a fixed question list with a progress bar, in place of
   upstream's open-ended turns.
4. **One approval gate** with a credit estimate.
5. A record on disk under `output/<slug>/`, named for the subject, not the date.
6. The five surrounding modes — style key, news radar, business, series, manual
   build — in `references/modes.md`.

**Two documented deviations from the vendored workflow.**

**The wizard.** Upstream spreads its choices across two open-ended question
turns and expects typed answers. Vox replaces them with a fixed list, asked in
the same order every run, every question a pick with a recommended default. Same
information, but selectable rather than typed, and the number of turns never
surprises anyone. Only open the preset gallery (`get_explainer_presets`) or the
full voice roster (`list_voices`) when a wizard answer asks for it.

*(Historical note: the CLI edition of this project also deviated on Phase 6,
because `explainer_video` did not exist in CLI v1.1.19 and vox had to assemble
locally with ffmpeg. On the MCP the `explainer_video` tool **does** exist, so
that deviation is retired — vox now follows upstream Phase 6 verbatim.
`scripts/assemble.py` is kept as an offline fallback, see Phase 6.)*

## Non-negotiables

1. **Exactly one approval gate.** The wizard is free and asks every run;
   research, script and storyboard are free too. Do all of it, then stop once and
   show everything with a credit estimate. The gate is about money, not turns:
   it is the only place a credit is committed and the only stop that needs a yes.
2. **Never spend a credit before that gate.** Preflight with `get_cost: true`,
   which is free, rather than submitting to find out.
3. **Never script from memory.** Every number gets two independent sources.
4. **The style key attaches to every single clip.** A clip generated without it
   is a defect, not a variation.
5. **Assemble in the same run.** Loose clips are a failure.
6. **No em dashes in narration lines.** Period, comma, colon, or parens.

**Paths.** Every `references/`, `assets/` and `scripts/` path below is relative
to the folder holding this file, and that folder is read-only. Run output goes
to `output/<slug>/` under `PROJECT_ROOT`: the folder holding the `.vox-root`
marker (a parent repo's `projects/vox/`, or `.` when the project is opened
directly). If there is no `.vox-root` — this skill was uploaded standalone —
`PROJECT_ROOT` is the session working directory, in Cowork the outputs
directory. Never write outside it.

## Defaults

Read `.env` at `PROJECT_ROOT` first, if there is one, and let it override this
table. Your explicit words in the request override everything.

| Setting | Default | `.env` key |
|---|---|---|
| Aspect | **9:16 vertical** | `VOX_DEFAULT_ASPECT` |
| Both aspects | **off**; on = generate 16:9, crop 9:16 free (see below) | `VOX_DUAL_ASPECT` |
| Length | **1 minute = 6 blocks** (N = minutes × 6, one 10s clip each) | `VOX_DEFAULT_MINUTES` |
| Style | **newsroom** (the bundled style sheet) | `VOX_DEFAULT_STYLE` |
| Style key | Reuse a saved `media_id` if set, else resolve per the style | `VOX_STYLE_KEY_ID` |
| Subtitles | ON, font `anton` | `VOX_SUBTITLE_FONT`, `VOX_SUBTITLES` |
| Character | Faceless, no mascot | `VOX_CHARACTER` |
| Language | English narration; all prompts stay English | `VOX_LANGUAGE` |
| Voice | Auto-pick a deep, measured documentary narrator | `VOX_VOICE_ID` |

## Bootstrap

```
mcp__Higgsfield__balance
```

Expect `{ credits, subscription_plan_type }`. Note the balance — you need it for
the gate.

- **Tool not found** → the Higgsfield MCP is not connected in this session. Stop
  and connect it: in the repo, open the project (`cd vox && claude`),
  approve the project MCP server from `.mcp.json`, and run `/mcp` for the
  one-time OAuth. Standalone: Cowork → Settings → Connectors → Higgsfield, or
  `claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp`.
  Do not attempt a workaround.
- **401 / auth error** → the OAuth token lapsed. Reconnect Higgsfield, then
  retry.

Never fake a generation, and never proceed past the gate without a real balance.

## The six modes

| Mode | What you get | Where it lives |
|---|---|---|
| **A. Explainer** (default) | One finished MP4 from a topic, trend, URL, or nothing | Q1–Q8, then Phases T→6 below |
| **B. Style key** | A permanent custom look for a new series or brand | `references/modes.md` |
| **C. News radar** | Three scored story candidates, then stop | `references/modes.md` |
| **D. Business** | A problem→product→CTA video about your own offer | `references/modes.md` |
| **E. Series** | A bible, bookends, an episode slate, and episode one | `references/modes.md` |
| **F. Manual build** | The same film, generated by hand in Flow for zero Higgsfield credits | `references/modes.md` |

**F is not picked at Q1 — it is picked at Q2**, because it is not a different
kind of video. It is mode A (or C, D, E) with a different pair of hands on the
generate button, so it composes with all of them.

B, C and E all feed mode A. The radar hands a verified brief to the explainer;
the style key becomes a `STYLE_KEY_ID` the explainer reuses forever; the series
slate is a queue of mode-A runs. Read `references/modes.md` when the wizard
lands on B, C, D or E at Q1, or on a non-Higgsfield backend at Q2 — each of those modes carries its own question set there.

## The wizard

**Every run walks it, including runs that already named a topic.** What you
already said is never thrown away and never used as an excuse to skip a
question — it becomes the **first, pre-selected option**, so accepting it costs
one keystroke. The wizard is free. Nothing here spends a credit.

**One question per screen**, one `AskUserQuestion` call each, in the order below.
Draw this header yourself in the message above every call:

```
🎬 VOX · explainer
Q4/8  ▓▓▓▓░░░  50%     mode ✓ · backend ✓ · topic ✓ · look …
```

Line 1 is the mode. Line 2 is the counter, a 7-cell bar, the percent, then a
trail: answered questions marked `✓`, the current one `…`, unasked ones left off.
Filled cells are `round(7 × n / N)` and the percent is `round(100 × n / N)`.
Modes B–E carry their own `N` and their own trail.

`N` is **8 normally and 9 when Q9 fires** — decide that before drawing the first
header, because the request already tells you whether a real person or brand is
named. Q10 is a clarifier and never counts toward `N`.

**Every question's first option is the default and carries `(Recommended)`**, so
the whole wizard walks with eight Enters. `.env` supplies those defaults: it
decides which option leads, rather than silently deciding the video. That is the
point — a setting you can see and override beats one you discover in the
output.

`AskUserQuestion` takes **four options maximum**, plus the automatic "Other" for
free text. Every list below fits. Never pad a list to four; three real options
beat four with a filler.

### Q1 `Making what` — What are we making?

| Option | Say |
|---|---|
| **Explainer video** *(Recommended)* | A finished sixty-second MP4. Give me a topic, or I'll find one. |
| Find me a story first | Scan the news in your niche, pitch three scored candidates, you pick. |
| A video about my business | Problem, reframe, proof, call to action. Not a news story. |
| Start a whole series | Series bible, title cards, an episode slate, and episode one built. |

Options 2, 3 and 4 are modes C, D and E — go to `references/modes.md` and walk
that mode's question set instead of Q3–Q8. **Mode B is deliberately not here**;
four options is the ceiling and a style key is not something a run starts *for*.
It is reached from Q4.

An explicit mode word in the request ("find me a story", "turn this into a
series") pre-selects that option. It does not skip the question.

### Q2 `Backend` — Who generates the clips?

**Ask this second, before anything else, because it changes the whole run**: the
engine list, the cost model, whether a credit is ever spent on Higgsfield, and
who does the generating.

| Option | Say |
|---|---|
| **Higgsfield, full auto** *(Recommended)* | I generate everything and hand you the finished MP4. One approval gate, then nothing to do. |
| Google Flow, manual | I write the prompts and the cut plan, you generate the clips by hand in Flow and drop them in, I assemble locally. Zero Higgsfield credits. |
| I already have the clips | Skip generation entirely. Point me at the files and I do voice, cut, captions and mix. |

Options 2 and 3 route to **mode F** in `references/modes.md` after the rest of
the wizard. They are not a different *kind* of video — the topic, the style, the
script and the storyboard are identical. Only who presses the button changes.

**Pre-select option 2 when the request names Flow, Veo, Runway, Kling or "I'll
generate them myself".** Pre-select option 3 when clips already exist on disk.

**Check the balance before recommending option 1.** `balance` is free and it runs
at bootstrap anyway. If the live balance cannot cover the length chosen at Q5,
say the exact shortfall here rather than at the gate, and let option 2 lead
instead — a manual Flow build costs zero Higgsfield credits and is the honest
answer to an empty wallet. Verified on a real run, 2026-08-05: a 5-block French
ad quoted 155–185 credits against a 109.85 balance, and the whole run went
through Flow for nothing.

### Q3 `Topic` — What's it about?

| Option | Say |
|---|---|
| **← what the user typed, verbatim** *(Recommended, when there is one)* | Mark it "you said this". |
| Find me something trending | I'll search, pick a story with a number in it, and name a runner-up. |
| *a concrete angle from AI, tech or money* | A real story, not a category. |
| *a second concrete angle* | Same. |

A URL or a Google Trends term counts as typed input and leads the list — Phase T
still resolves what it actually means. On a bare run there is no first option and
*Find me something trending* leads instead.

### Q4 `Look` — Which house style?

The three house styles in the table further down, one line each, `newsroom`
first and Recommended, plus:

| Option | Say |
|---|---|
| Build me a custom one | A permanent look for a new series or brand. |

That last one routes to **mode B** in `references/modes.md`, then comes back here
with the new key and continues at Q4.

### Q5 `Length` — How long?

| Option | Say |
|---|---|
| **1 minute** *(Recommended)* | 6 blocks · ~200–250 cr |
| 30 seconds | 3 blocks · ~100–130 cr |
| 3 minutes | 18 blocks · ~600–700 cr |
| 5 minutes | 30 blocks · ~1000–1150 cr |

These are the quotes from the cost table below, re-render allowance included.
They are a sanity check shown early, not a promise; THE GATE still quotes
`get_cost`.

### Q6 `Aspect` — Which shape?

| Option | Say |
|---|---|
| **9:16 vertical** *(Recommended)* | Shorts, Reels, TikTok. |
| 16:9 horizontal | Long-form YouTube. |
| Both | One 16:9 render plus a free center-cropped 9:16 cut. Costs nothing extra. |

**Both binds Phase B.** Every scene then has to compose for the middle third —
see the dual-aspect rule below. Carry that constraint forward; it is the whole
cost of the free second cut.

### Q7 `Voice` — Who narrates?

| Option | Say |
|---|---|
| Your cloned voice | Offered **only** when `VOX_VOICE_ID` is set or `list_voices` shows a `voice_type: element` clone. When it exists it leads and takes the Recommended mark. |
| Auto documentary narrator | Deep and measured, picked from `list_voices`. Leads and is Recommended when there is no clone. |
| Let me pick | Show the full `list_voices` roster. |
| I'll record it myself | Hand over the script block by block and wait for the wav files. |

Exactly one option is marked: the clone if there is one, otherwise the auto
narrator. A pinned voice that the wizard then recommends past would defeat the
reason for pinning it.

### Q8 `Engine` — Which video model?

| Option | Say |
|---|---|
| `gemini_omni` | 30 cr/clip. Default workhorse. Only engine that renders recognizable statesman likenesses. |
| `seedance_2_0` 720p | 45 cr/clip. In-prompt cuts, literal speed ramps and whip pans, native SFX. |
| `seedance_2_0` 1080p | 90 cr/clip. Same, at double the bill. |

**Order and mark flip off Q4.** On `diorama`, `seedance_2_0` 720p moves to first
and takes the Recommended mark. On `newsroom` and `mixed-media`, `gemini_omni`
leads and takes it. 1080p is never first and never marked. This is the one place
the list reads an earlier answer, and it mirrors the engine table below.

Each description carries the **run total for the length chosen at Q5**, not just
the per-clip price. Six blocks on seedance is a different conversation from six
on gemini.

**On a Flow backend the list is different**, and it is not a Veo-only list.
Flow Lab also runs Omni. **Do not assume the roster** — read what the account
actually offers at run time, because it changes, and quote from that.

What does not change is the constraint that decides the tier:

> **Pick the tier by whether it accepts reference images, not by its price.**

A tier that takes no reference cannot hold a character or a product across clips,
whatever it costs. Verified on a real Flow run, 2026-08-05:

| Tier | Cost (Ultra) | Reference images |
|---|---|---|
| **Veo 3.1 Fast** | 10 | **yes** — takes ingredients |
| Veo 3.1 Lite | 5 | yes, weaker |
| Veo 3.1 Quality | 100 | **NO — cannot take ingredients** |

That single fact overturns the obvious plan. Spending 100 credits on "the hero
shot" buys the one clip in the film with no reference attached, which is
precisely the clip where drift is most visible. **Everything on the
reference-capable tier, references on every clip, and re-roll rather than
escalate** — ten Fast re-rolls cost less than one Quality generation and each of
them keeps the character.

**Ask before quoting Omni on Flow.** Its Flow tiers, price and reference support
are not recorded here and must not be guessed. Get them from the user or from the
account, then write them down with the date, like every other number in this
file.

**The backend argument is about what surrounds the model, not the model.** Since
the same engines can be reachable on both sides, do not sell Higgsfield on the
engine. Sell it on what Flow has no equivalent for: reference elements and Soul
identity training, Marketing Studio, server-side assembly, and one credit
balance you can preflight with `get_cost`. Flow wins on cost — zero Higgsfield
credits — and on reaching whatever the account offers today.

### Q9 `Likeness` — only when something real and recognizable is named

**Fires whenever the topic names a real person, company, product, logo or
place** — "Tom Lee", "the iPhone", "OpenAI", "the Sydney Opera House". Skip it
entirely for abstract topics. You do not need research to know whether a name is
a real thing; the request already told you.

| Option | Say |
|---|---|
| **Accurate likeness from reference** *(Recommended)* | I'll find real photos first and match the distinguishing features. |
| Suggest them, don't depict them | A back view, a silhouette, an empty chair, hands only. No face. |
| Leave them out entirely | The story carries it. Objects and data only. |

Whichever is chosen, **Phase A runs**. Option 1 makes Phase A binding; options 2
and 3 still need the reference so the *avoidance* is deliberate rather than a
model default, and so the gate can say which was chosen.

### Q10 — one clarifier, only if needed

Ask **one** more question when something is genuinely ambiguous and guessing
wrong would waste the run: a paywalled URL, a topic term with two unrelated
meanings, a business brief with no identifiable offer. Otherwise skip it in
silence.

This is not a confirmation step. Never use it to re-ask something Q1–Q9 already
settled, and never use it to ask about subtitles, language or block seconds —
those stay `.env` defaults and your explicit words still override them.

**After the wizard, never ask again. The next time you stop is THE GATE.**

## Pipeline

| Phase | What happens | Cost |
|---|---|---|
| **Wizard** | Q1–Q8, one screen each, plus Q9 and a clarifier if needed | free |
| T Topic | resolve the input into one topic and angle | free |
| R Research | verified facts, numbers, two sources each | free |
| **A Assets** | **look at real references before describing anything real** | free |
| S Script | N narration blocks | free |
| B Storyboard | N video prompts in the chosen style | free |
| **GATE** | **show everything + credit estimate, stop** | — |
| 1–6 | style key, voice, clips, assembly, per the vendored workflow | paid |

Phases 1 to 6 are `higgsfield-video-explainer`'s. Do not reimplement them.

## Phase T — Topic

Four input modes. Detect which one was used.

| Input | Do this |
|---|---|
| **A topic** ("the AI bubble") | Use it. Go to Phase R. |
| **An article URL** | Fetch it. Extract the claim, the numbers, and the angle. Then search for two more sources on the same story so the script is not one outlet's framing. |
| **A Google Trends term or "what's trending"** | Treat the term as a seed, not the topic. Search for news and articles behind why it is spiking right now, then pick the specific story with a number in it. A rising search term is a symptom; the video is about the cause. |
| **Nothing** | Research what is trending, then propose one. |

For the no-topic case, search 2 or 3 angles (`trending topics this week <current
month year>`, `most searched questions this week`, plus a vertical you care
about: AI, tech, money). A good Vox-able topic has a **why/how question** at its
core, at least one **surprising number or reversal**, strong **visual potential**
(maps, charts, objects), and broad appeal.

Avoid breaking tragedies and active disasters, celebrity gossip with no data
angle, and anything you cannot verify against two independent sources.

Always name the chosen topic in the gate message with one runner-up, so it can
be swapped in a word.

## Phase R — Research

Fetch the 2 or 3 best sources. Collect the hook stat, 3 to 5 concrete facts with
numbers and dates, the counterintuitive turn, and the who/what/where specifics
that make blocks vivid. Cross-check every number against a second source. A vague
true line beats a specific false one. No fabricated quotes, no invented numbers.

Keep a Sources list for `brief.md` and the final message.

## Phase A — Reference assets

**Runs whenever the video depicts anything real and recognizable**: a named
person, a company's product, a logo, a landmark, a specific object. Skip it only
when every scene is abstract. It is free, it happens before the storyboard, and
it exists because of one rule:

> **Never describe a real thing from imagination.** A prompt written from memory
> produces a stranger who is confidently wrong, and you will not notice until the
> clips are paid for. Look at the thing first.

### Procedure

1. **List the real subjects.** Every person, brand, product or place a block
   would show. Usually one or two.

2. **Find real images of each.** Prefer a primary source: the person's own
   company bio page, the firm's press kit, the manufacturer's product page.
   Search, then fetch. A search result snippet is not a look at the thing.

3. **Actually look at it.** Download the image and open it. Reading a caption
   that says "headshot" is not the same as seeing the face. This step is the
   whole point of the phase.

4. **Save it** to `output/<slug>/reference/` with a descriptive filename, and
   record the source URL in `brief.md`.

5. **Write the distinguishing features in words** — the three or four things that
   make this subject recognizable and nobody else. For a face: eyewear shape and
   weight, hairline and hair volume, facial hair, build, age, habitual
   expression. Glasses are usually the single strongest identifier; getting
   "round" versus "thick rectangular" wrong loses the likeness by itself.

6. **Paste that description verbatim into every block** that shows the subject,
   and put its opposites in the NEGATIVE line (`round eyeglasses, thin wire
   frames, bald head, grey hair`). A negative that names the wrong version is
   worth more than another adjective describing the right one.

### Do not feed a real person's photo to the generator

Passing a real, identifiable person's photograph into `generate_video` or
`generate_image` as a likeness reference **is rejected by moderation**, returning
status `nsfw` with no error text. Verified on a real run, 2026-07-30.

That guardrail exists to stop synthetic media of real people. **Do not reword
prompts to get around it, and do not try a different model to see if it lets you
through.** The reference image is for *your* eyes, so you can write an accurate
text description; it is not a generation input. An accurate description is both
permitted and sufficient — it produced a clearly recognizable likeness on the run
that discovered this.

Products, logos, landmarks and objects do not trip this. Only faces do.

### What lands at the gate

The gate gains a `SUBJECTS` line naming each real subject, the reference found,
and the feature description that will go into the prompts. This is the cheapest
possible moment to hear "that is not them" — it costs nothing, where the
same correction after generation costs 30 credits a block.

If no reference can be found or verified, **say so at the gate** and default to
the Q8 "suggest them, don't depict them" treatment. Shipping an invented face for
a named real person is a defect, not a stylistic choice.

## Phase S — Script

N blocks labeled `Block 1 … Block N`, each **~20–24 words** (about 8 to 9 spoken
seconds, hard ceiling near 9.5s). Plain spoken text only: no stage directions, no
parentheticals, numbers spelled out ("seventy percent", "twenty twenty-four").
No em dashes. Never say "in this video".

**Write for the synthesizer, not the page.** A period costs about 0.7 seconds of
silence, so use commas where you want pace and save periods for the beats you
actually want to land. One flowing comma-joined sentence reads far closer to its
word count than three clipped ones. Read every line back and cut any word a
person would not say out loud.

Shape:

- **Block 1 — cold open.** The most surprising fact or question, stated flat.
- **Block 2 — stakes.** Why this is weird, or why it matters to the viewer.
- **Middle — evidence.** One idea per block, each anchored to a concrete number,
  date, place, or comparison. Escalate.
- **Block N−1 — the turn.** The counterintuitive reveal.
- **Block N — resolution + kicker.** Land it on a line that reframes Block 1.

**Tone is locked: Vox house documentary.** Curious, precise, a little wry. Short
declarative sentences. The narrator explains, never hypes. No direct address, no
"let's talk about it", no hype adjectives. The format is faceless, so there is no
personality on screen to carry a bigger voice; the restraint is what sells it.

Do **not** route narration through a personal-voice skill if one is installed.
Those are built for a first-person channel voice and they fight the
anonymous-narrator format. Only use one if it is asked for by name on a specific
run.

## Phase B — Storyboard

Write N video prompts in the exact labeled template from
`references/workflow-prompts.md`:

```text
Block N
STYLE REFERENCE: Match the attached reference image EXACTLY. Replicate its look precisely: <STYLE tokens>. Every element below rendered in that identical style.
SCENE: <one scene and one clear action matching Block N narration>.
MOTION: <camera move and animation behavior>.
AUDIO: <ambient SFX or music only, no voice, no narration>.
NEGATIVE: <style bans>, color drift, photorealism, 3D render, lip-sync, captions, on-screen text, logos, watermark.
```

Pull the STYLE tokens and the scene vocabulary from the chosen style file. Paste
the **same** STYLE tokens into every block.

### The story engine

A run of pretty, disconnected scenes reads as a slideshow. Five things separate
a video that holds sixty seconds from one that does not, and the first is not
optional:

- **One through-line object.** A single physical metaphor that appears in
  *every* block and escalates each time: a paper box going sealed → broken →
  rebuilt, a fuse burning across all scenes, a balloon pumped toward a needle.
  Decide it before writing a single block, name it in the gate message, and put
  it in every scene description. This is the part almost everyone leaves out and
  it is what makes sixty seconds feel like a film.
- **A question hook, answered last.** Put the question on a prop in block 1 or
  the finale ("WHO PAYS?", "WHO BLINKS?"). The narration withholds the answer
  until the kicker.
- **Fake-oner.** Write each clip as one continuous camera move that begins and
  ends in motion blur (dive, whip, flare, fall). Hard cuts between blocks then
  read as one unbroken shot, with no frame-matching and no loss of parallelism.
- **An impact every ~3 seconds** — slam, stamp, shockwave, snap — and at least
  one speed ramp per block. Alternate extreme macro against wide, and whiplash
  the scale: giant face, then ant-sized figures, then a colossal prop.
- **One reveal shot** the whole video is remembered by: a crowd arranged into a
  meaningful silhouette, something only visible when the camera cranes up.

### What actually makes a clip render, not mush

Everything above is about the film. This is about the engine. All of it was
measured on real failed generations, 2026-08-05, on Veo 3.1 — but it is engine
behaviour, not vendor behaviour, and it holds on `gemini_omni` and
`seedance_2_0` too.

**1. One camera move. One articulated element. No traversing solid objects.**
This is the whole rule and the third clause is the one people break. A prompt
that started in macro *inside* a wardrobe, pulled back through the hanging
clothes and swung around to the outside failed every single generation: video
models have no coherent 3D space, so crossing a solid surface or reversing the
viewpoint is the most reliable way to make geometry chew itself. Keep the camera
on one side of every wall.

**2. Two or three beats per eight-second clip. Not seven.** Count them before
submitting. Macro → clack → pull-back → swing outside → rise to a face → door
shut → hold is seven, and it produced garbage. The same beat list cut to two
rendered first time.

**3. Count the objects in the NEGATIVE line.** `one wardrobe, one door, one
hinge, one woman, two hands` is worth more than ten adjectives describing the
right wardrobe. Naming the *quantity* is what stops duplicated doors and third
arms.

**4. Name what does NOT change.** When something in the frame transforms, state
the invariant beside it: *"her shoulders, her height and her posture are
unchanged"*. Two payoffs — the change reads as deliberate rather than as a morph,
and the model has something to hold still. A whole subject transforming at once
comes back as melting clay.

**5. NEVER name a forbidden thing in order to forbid it.** There is no separate
negative field in Flow, and none in the MCP either: the whole prompt goes to one
safety classifier as a single blob. Writing `no nudity, no bare torso, no
lingerie, no sexualised framing` puts *nudity*, *torso*, *lingerie* and
*sexualised* into the prompt, and a stack of them is enough to get a fully
innocent shot refused. Verified: a clip was rejected with that list, and the
identical shot passed once the list was replaced by one positive line —
*"both fully dressed in ordinary everyday clothes. Warm, wholesome, gentle,
domestic."*

Negatives are only safe on **neutral vocabulary**: `no cuts`, `no warped
geometry`, `no duplicated figures`, `no on-screen text`. For anything sensitive,
describe positively what you *do* want in frame.

**6. Let the cut do what the model cannot animate.** Costume changes, getting
dressed, and any fiddly manipulation are where generation fails. Cut around
them: end one shot as the garment is handed over, start the next with it already
worn, and skip the source in between. A turn on the spot does the same job inside
a single clip. The ellipsis is free and it always works.

**7. Show attachment before loss.** A prompt is not just a description, it is a
sequence of what the viewer learns. Sliding a dress along a rail reads as tidying
up; *holding* it first, then putting it away, reads as giving something up. Same
shot length, entirely different meaning. Whenever a block is about losing,
keeping or choosing something, give the object one beat of being held.

**8. Make the argument in colour, so it survives the sound being off.** One
object as the only warm hue in the frame, and a shot that ends without it, says
"this is gone" to a muted viewer. Most of the audience sees the first seconds
with no sound.

### Two rules that are easy to forget

- **Text in clips is a trap.** For `mixed-media` and `newsroom`, ban it
  outright: AI lettering doubles and garbles. Typography beats become abstract
  bars, redaction blocks, circles and underlines, and the real captions get
  burned server-side at assembly. `diorama` is the deliberate exception — its
  signature is letterpress *on props* — and even there it is **one label per
  scene, four words maximum, three text elements maximum in frame**, always
  fenced in the NEGATIVE line. Add `repeated text, doubled text, two lines of
  identical text` to the negatives on any block that carries a label.
- **Nobody speaks on screen.** The AUDIO line is ambient and SFX only.

## The styles

| `VOX_DEFAULT_STYLE` | Look | Reference file | Closest CMS preset |
|---|---|---|---|
| `newsroom` (default) | Aged newsprint, halftone cutout people with red keylines, giant stat numbers | `references/style-newsroom-collage.md` | Editorial Motion Graphics `56fc6472-33b7-45dc-83ff-80c71d40aec6` |
| `mixed-media` | Flat bright editorial collage, archival cutouts on bold color fields, marker circles | `references/style-mixed-media.md` | Mixed Media `80e4dd7b-cd65-42d4-b191-b58d62558602` |
| `diorama` | Cinematic sepia paper diorama, censor-bar figures, burnt-orange accent | `references/style-paper-diorama.md` | Paper Diorama `83d276f6-e3aa-49b8-82f2-1a0bb7d0a370` |

Read the chosen file before Phase B. Each carries its STYLE tokens, its scene
vocabulary, and its style-key prompt.

**Three ways to get the style key, cheapest first:**

1. **Bundled sheet (free).** The newsroom style ships with a working key at
   `assets/newsroom-style-sheet.png`. Upload it once with `media_upload`
   (`filename: "newsroom-style-sheet.png"`), PUT the bytes to the returned
   `upload_url`, then `media_confirm`. Keep the `media_id` — that is
   `STYLE_KEY_ID`, reusable on every future run, so this upload is a one-time
   cost of zero credits. The prompt that produced the sheet is in
   `assets/newsroom-style-sheet-prompt.txt`.
2. **Resolve a CMS preset (free).** `resolve_explainer_preset(preset_id)` imports
   the hidden style image and returns a `media_id`. The preset reference controls
   framing, so if it fights the requested aspect, say so at the gate rather than
   silently losing the aspect.
3. **Generate one (costs an image).** `generate_image` with model
   `nano_banana_pro`, the style-key prompt from the style file, and
   `aspect_ratio: "9:16"`. Use this when a custom look is wanted, or when a
   reference image is supplied as a style donor.

Verify the preset UUIDs against `get_explainer_presets` before using one. The
list is live and IDs can change.

## Dual aspect — one set of clips, two cuts

When `VOX_DUAL_ASPECT` is on, the same episode ships as a horizontal long-form
cut *and* a vertical short. **Never generate a block twice to get
both** — that doubles the only expensive part of the run for no reason.

The rule:

1. **Generate every clip at 16:9.** Pass `aspect_ratio: "16:9"` explicitly, as
   always.
2. **Assemble 16:9 first.** That is the native cut; its `width`/`height` come off
   the clips' real job records.
3. **Re-run `explainer_video` center-cropped to 9:16** — `width: 720`,
   `height: 1280`, and **omit `subtitles`** (see below). Re-assembly is free, so
   the second cut costs nothing.
4. **Burn the vertical captions locally**, sized for 720 from the start:

   ```bash
   python3 scripts/burn-vertical-captions.py output/<slug>/
   ```

5. Write them as `final-16x9.mp4` and `final-9x16.mp4`.

**`explainer_video` burns subtitles at the SOURCE clip width, then crops.**
Assembling 1280×720 clips at 720×1280 with `subtitles` lays the captions out for
the wide frame and then cuts their edges off. On the run that found this, it
clipped "straight into QuickBook[s]" and left the call to action reading "our
books at bookzer[o]" — the brand name itself. Verified 2026-07-30.

So the vertical cut is assembled clean and captioned locally. The script reads
each block's real `audio_duration` from `manifest.json` to time the phrases, so
**record those durations as you measure the takes**. An un-subtitled assembly is
also free where a subtitled one costs 0.45, so this fixes the captions and costs
slightly less.

**This crop is lossy and Phase B has to plan for it.** A 9:16 crop keeps the
middle third of a 16:9 frame and throws away both sides. So when dual aspect is
on, every scene description must put the through-line object, the subject and any
label **inside the central vertical band**, and push texture and background
interest to the edges where losing them costs nothing. A composition framed wide
for 16:9 will read as a stranger's video once cropped.

Going the other way — generating 9:16 and padding out to 16:9 — is not allowed.
It pillarboxes, and pillarboxed long-form looks like a reposted TikTok.

Say both aspects at the gate, and say which one is native.

## THE GATE

**Show the script in full. Keep the storyboard folded away.** The narration is what
viewers hear, so that is what the user reads. The N visual prompts are written and
ready, and they go to `storyboard.md` on disk, but they are not pasted into the
gate message unless they ask. This format is a locked decision.

Post one message in this shape:

```
TOPIC   <one line>
ANGLE   <one line>            RUNNER-UP  <topic swappable in a word>

SCRIPT  (N blocks · <runtime> · <aspect>)
1  <Block 1 narration>
2  <Block 2 narration>
…

STYLE   <style> · through-line: <the one escalating object>
VOICE   <narrator name, or "your recording">
ASPECT  <native aspect> native<, + 9:16 cropped free — only when dual aspect is on>
SUBJECTS  <real subject> — <reference found> · <the features going into every prompt>
          (omit this line entirely when nothing real is depicted)
STORYBOARD  N prompts ready → say "show storyboard"

COST    ~<N> cr est · balance <live balance>

Approve, or tell me what to change.
```

When N is above 6, lead the COST block with the total and the block count on its
own line:

```
COST    ~915 cr est · 30 blocks · balance <live balance>
```

Then **stop**. Do not submit a paid job until the user replies. If they ask to see the
storyboard, print it and hold the gate open. If they ask for changes, revise and
re-post.

**Price it before quoting.** Preflight is free — pass `get_cost: true` and no job
is submitted:

```
generate_video  { model: "gemini_omni", prompt: "<block 1 prompt>",
                  duration: 10, resolution: "720p", get_cost: true }
generate_audio  { model: "seed_audio", prompt: "<block 1 line>", get_cost: true }
```

Measured 2026-07-29: **`gemini_omni` 30 credits per clip**, **`seedance_2_0` 45
(720p) or 90 (1080p)**, **`seed_audio` 0.6 credits per voice block**, assembly
free, subtitles 0.05 per voiced block.

A 1-minute gemini run (6 blocks) is **~184 credits** clean. **Quote 200 to 250**
— one or two re-voice rounds and a re-rendered block are normal, not failure,
and a gate that quotes the perfect-run number is a gate that lies. A 1-minute
seedance run is ~275 clean. Re-measure with `get_cost` every run; these numbers
are a sanity check, not a source.

**Cost is linear in length, and long-form gets expensive fast.** N = minutes × 6,
and clips are the whole bill, so the estimate scales straight off N:

| Length | Blocks | gemini, clean | Quote |
|---|---|---|---|
| 1 min | 6 | ~184 cr | 200–250 |
| 3 min | 18 | ~550 cr | 600–700 |
| 5 min | 30 | ~915 cr | 1000–1150 |

When N is above 6, **put the total on its own line at the top of the COST block
and name the block count**, so a four-figure number is impossible to skim past.
If the estimate exceeds the live balance, say the exact shortfall at the gate
rather than starting a run that dies at block 19.

Dual aspect adds nothing: the second cut is a free re-assembly.

## Phases 1–6 — Generate

Follow `references/workflow-video-explainer.md` exactly. The order matters
and the barrier between voice and clips is strict:

1. **Style key** — the bundled PNG's `media_id`, a resolved preset, or
   `generate_image` for a custom style. Keep it as `STYLE_KEY_ID`.
2. **Voice** — see "Voice modes" below. Default is `list_voices` then auto-pick a
   deep measured documentary narrator; note the exact `voice_id` and `voice_type`
   and reuse that one pair everywhere.
3. **All N voice takes** — `generate_audio`, model `seed_audio`, same voice every
   block. Finish all of them before starting clips. **This barrier is strict:**
   each take's real duration is what tells you whether a line needs shortening
   before you spend 30 credits on its clip.

   **Verify every take's real duration before you go on.** Read `durationSec`
   off the completed job and target **9.0 to 10.5 seconds**. The block window is
   a fixed 10s: a 7s take gets centered, so it starts 1.5s late and reads as
   desync; a 13s take gets squeezed thirty percent and reads as rushed. A slight
   overrun beats a late start.

   TTS pacing is wildly unpredictable and word count does not predict it.
   Narrator voices pause about 0.7s at every period, so a choppy name-heavy line
   reads at ~1.8 words per second while one flowing comma-joined sentence reads
   at ~2.5. The same twenty-two words can differ by four seconds. Expect one or
   two re-voice rounds and keep the best take per block.

   **Trim leading and trailing silence off every take.** A take with three
   seconds of dead air at the front buries the hook, and it is invisible until
   you watch the finished cut.
4. **All N clips** — `generate_video`, `duration: 10`, `resolution: "720p"`, and
   the style key in `medias` on every single one.

   **Pass `aspect_ratio` explicitly on every clip.** Upstream claims
   `gemini_omni` inherits framing from the key image. **It does not** — verified
   on a real run: a 9:16 key still produced 16:9 clips. Send `"9:16"` or
   `"16:9"` yourself, every time. Believing the docs here silently ruins a whole
   batch.

   **Expect the server to intercept the first submission** with a
   `preset_recommendation` notice — it pattern-matches stylized collage prompts
   to its own presets (3D RENDER, IN THE DARK, FREE FALL…). **Never accept
   one:** resubmit with `declined_preset_id` taken from the notice's
   `retry_literal_with`. That id suppresses only that exact preset, so a
   different prompt may trip a different one.

   **Engine choice:**

   | Model | Cost | Use for |
   |---|---|---|
   | `gemini_omni` | 30 cr | Default workhorse for `newsroom` and `mixed-media`. Also the only engine that renders recognizable statesman likenesses from descriptions. |
   | `seedance_2_0` | 45 cr (720p) · 90 cr (1080p) | `diorama`, and any "make it cinematic / impressive" brief. Executes in-prompt cuts ("Shot 1 … Cut to shot 2"), reads "speed ramp" / "FPV" / "whip pan" literally, and generates native SFX and score with `generate_audio: true`. **That bed does NOT survive assembly — see below.** Call template in `references/style-paper-diorama.md`. |

   **`explainer_video` REPLACES clip audio with the voice take. It does not mix.**
   Passing `audio` on a block discards that clip's entire soundtrack, so every
   Seedance rain, thunder, keyboard and score bed you paid for is thrown away and
   the finished cut is voice over **digital silence**. The tool description says
   so in plain sight — *"Omit or set null to keep the clip's own audio"* — and an
   earlier version of this file claimed the opposite. Verified by measurement on a
   real run, 2026-07-30: raw clip at −21.7 dBFS, the same 0.7s of the assembled
   file before narration starts at **−99 dBFS**.

   **This defect is invisible to every normal check.** The assembled file has an
   audio stream, the right duration, and audible narration. Confirming the clip
   has an audio track proves nothing, because the clip is not what got assembled.

   **So when the brief asks for background sound, assembly is not the last step.**
   Assemble as usual, then rebuild the audio locally: concatenate the clips' own
   audio into a bed, duck it under the assembled voice track with
   `sidechaincompress`, and remux. `restore-sound-bed.py`, written to
   `output/<slug>/` on the run that found this, does exactly that and costs
   nothing. **Verify by measuring RMS in a gap between phrases, not by listening
   for the voice.** A gap reading of −99 means the bed is gone.

   Quote whichever engine you pick at the gate — a diorama run on seedance is
   half again the cost of the same run on gemini.
**4b. MEASURE WHERE THE BEATS ACTUALLY LANDED, before cutting anything.**
Free, two minutes, and it caught three real defects on the run that introduced
it. Whatever the storyboard said would happen at second five, the engine put
somewhere else.

```bash
# une planche-contact par clip : 16 vignettes, une toutes les 0,5s
ffmpeg -v error -y -i clips/clip-A.mp4 \
  -vf "fps=2,scale=180:-1,tile=4x4" -frames:v 1 .build/sheets/A.png
```

Open every sheet and write down the real second of each impact, each prop
becoming legible, and each reveal. **Then** solve the cut against those numbers.

Verified 2026-08-05 — every one of these would have shipped broken:

| Planned | Actually |
|---|---|
| the dress leaves the wardrobe by source 6.4 | **7.0 to 8.0**, the very end of the clip |
| the `-50%` tag lands at source 5.5 | **6.0 to 6.6** |
| the door shuts around source 5.4 | **5.5 to 6.5**, with the face after it |

A prop is legible **later than it strikes** — a stamped number needs about 1.5s
after the impact before it reads. Time the shot on when it is *legible*, not on
when it lands.

5. **Assemble server-side** — `explainer_video` with one item per block, in play
   order. Block N audio always lands on clip N.

   **Read the finished clips' actual `width`/`height` off their job records and
   pass those.** If the clips came back in a different aspect than planned, the
   assembly must match the clips, not the plan — otherwise every frame gets
   letterboxed or cropped.

```
explainer_video
  params:
    width: 720            # the clips' REAL width  (1280 for 16:9)
    height: 1280          # the clips' REAL height (720  for 16:9)
    subtitles: { font: "anton" }      # omit entirely when subtitles are off
    items:
      - { video: "<clip 1 job id>", audio: "<voice 1 job id>" }
      - { video: "<clip 2 job id>", audio: "<voice 2 job id>" }
      …
```

6. **Restore the sound bed — this is a required step, not an optional polish.**
   Assembly has just discarded every clip's own audio (see the `explainer_video`
   warning in step 4). Run it on every assembled file:

   ```bash
   python3 scripts/restore-sound-bed.py output/<slug>/ final-16x9.mp4 final-9x16.mp4
   ```

   It concatenates the clips' audio into a bed, trims each to exactly the block
   length so there is no cumulative drift, ducks the bed under the assembled
   voice with `sidechaincompress`, and remuxes. It spends **no credits**, and it
   re-times nothing because assembly already placed the voice. Skip it and the
   deliverable is narration over silence.

   **Then confirm it worked by measuring**, per step 0 of "Verify before
   delivering". Running the script is not evidence that the bed is there.

Save every job id into `output/<slug>/manifest.json` as you go, so a crashed run
resumes instead of re-paying. Then download `final.mp4` into the run folder so
the deliverable survives independently of Higgsfield's storage.

Manifest shape:

```json
{
  "slug": "ai-bubble-capex",
  "date": "2026-07-29",
  "aspect": "9:16",
  "block_seconds": 10,
  "subtitles": true,
  "subtitle_font": "anton",
  "style_key_id": "<media_id or job id>",
  "assembly": "explainer_video",
  "assembly_job_id": "<job id>",
  "blocks": [
    {"clip_job": "<job id>", "audio_job": "<job id>",
     "clip": "clips/block-01.mp4", "audio": "audio/block-01.wav",
     "text": "<Block 1 narration, for the burned captions>"}
  ]
}
```

### Offline fallback: `scripts/assemble.py`

`explainer_video` is the default and it needs no local tooling. Keep the local
assembler for the two cases it still wins:

- The takes were recorded by hand and are already on disk (though uploading them
  with `media_upload` and passing the `media_id` as a block's `audio` also
  works, and keeps assembly server-side).
- The MCP is unreachable and the clips are already downloaded.

It reproduces the same timing contract: fixed 10s windows, short takes centered,
slight overruns compressed pitch-safely, video never stretched, wrong-aspect
clips cropped back into frame, total = N × 10s exactly. It writes a sidecar
`.srt`, and if the local ffmpeg lacks libass it says so and skips burning rather
than failing. It needs ffmpeg on PATH; `explainer_video` does not.

```bash
python3 scripts/assemble.py output/<slug>/manifest.json --dry-run
python3 scripts/assemble.py output/<slug>/manifest.json
python3 -m pytest scripts/test_assemble.py    # 19 tests
```

## Voice modes

Three ways to get narration. All three end up as a per-block audio reference the
assembler can use, and the rest of the pipeline does not care which was used.

### A. Higgsfield TTS (default)

`generate_audio`, model `seed_audio`, with one of the preset narrators from
`list_voices`. Fully automatic, nothing for the user to do.

Pin one voice in `.env` as `VOX_VOICE_ID` + `VOX_VOICE_TYPE` so every video sounds
the same. Otherwise auto-pick a deep, measured documentary narrator each run.

### B. The user records it

Fully supported, and **the recording order matters.** Voice comes before clips in
this pipeline because take durations drive the timing. So:

1. Approve the script at the gate.
2. **Stop and hand over the script**, block by block, with the target of about 8
   to 9 seconds per block. Say to save one file per block as
   `output/<slug>/audio/block-01.wav` … `block-NN.wav`. Any wav or mp3 works, and
   sample rate does not matter.
3. Wait for confirmation that they are in.
4. Probe each file's real duration. If a take exceeds about 11 seconds, name the
   block and offer either a re-record or a shorter line.
5. Upload each take with `media_upload` + `media_confirm` and use the returned
   `media_id` as that block's `audio` in `explainer_video`. (Or assemble locally
   with `scripts/assemble.py` if ffmpeg is handy and you would rather not
   upload.)

Do **not** generate the clips first and ask for a voice-over afterwards. That
locks the visuals to timing the delivery has to chase, and it is the harder way
round for no benefit.

To replace only some blocks, use the supplied files where they exist and
`seed_audio` for the rest. Both paths mix freely.

### C. Clone the voice once, then mode A forever

The best of both, and worth setting up once. On the MCP this no longer needs the
web app: `create_voice` (and `create_voice_from_confirmed_audio`) clone a voice
directly. A clone then appears in `list_voices` with `voice_type: "element"` and
is used exactly like a preset.

Put that id and `element` into `.env` as `VOX_VOICE_ID` / `VOX_VOICE_TYPE`. Every
future video is then in that voice with zero recording effort, including the
other-language variants.

Check `list_voices` for existing clones rather than assuming there are none.

## Output layout

```
output/<topic-slug>/
  brief.md        topic, angle, sources, settings, credit estimate vs actual
  script.md       the narration, block by block
  storyboard.md   the video prompt for every block, plus the STYLE tokens used
  manifest.json   block → clip + audio job ids and files, style key id
  reference/      real photos the prompts were written from   (Phase A)
  clips/          block-01.mp4 … block-NN.mp4   (downloaded from Higgsfield)
  audio/          block-01.wav … block-NN.wav
  final.mp4       the deliverable
  final.srt       captions, uploadable to YouTube as-is (local assembler only)
```

**The folder is named for the subject, not the date.** A slug says what a run
was; a date says only when, and several runs share a day. Use three to five
words, lowercase, hyphenated, specific enough to tell two videos on the same
story apart: `tom-lee-ethereum-bet`, not `tom-lee` and not `2026-07-30-tom-lee`.

The date is not lost — it is the first line of `brief.md`, where it can be read
without being the thing you navigate by.

**If the slug is already taken**, look inside before doing anything. Same
subject *and* same angle means this is a re-run: keep the folder and overwrite,
since the manifest is what stops you re-paying. A genuinely different take on the
same subject gets a distinguishing slug, not a numeric suffix
(`tom-lee-ethereum-bet-vertical`, `tom-lee-ethereum-bet-3min`). Never write into
a populated folder you have not opened.

Modes B and E write reusable artifacts outside the run folder, because they
outlive any single video:

```
styles/<name>.png    a custom style key      (mode B)
styles/<name>.md     its style bible         (mode B)
series/<name>/       bible.md, slate.md, checklist.md   (mode E)
```

In the repo, `output/` is **deny-by-default**: everything under it is ignored
except the four text files above — `brief.md`, `script.md`, `storyboard.md`,
`manifest.json`. So the record of every video survives without the gigabytes, and
a media format nobody has thought of yet cannot leak in by default.

That makes the text files the durable record, and the media disposable. Write
them as if the clips were already gone: `brief.md` carries the sources and the
real credit cost, `storyboard.md` carries the prompts that produced each shot,
and `manifest.json` carries the job ids. Between them a run is reproducible.
Anything else that must outlive the machine belongs in `styles/` or `series/`.

## Verify before delivering

Do not call it done off the assembly job alone. **Check the sound first**, then
pull one frame from each clip and check five more things.

### 0. The sound bed is actually in the file — check this before anything else

**`explainer_video` replaces clip audio with the voice take. It does not mix.**
So unless the bed was restored after assembly, the deliverable is narration over
digital silence. This is the most expensive defect in the pipeline because it
destroys something already paid for, and it is invisible to every casual check:
the file has an audio stream, the right duration, and audible narration.

**Measure RMS inside a gap between phrases.** Do not listen for the voice, and do
not check that the clip has an audio track — the clip is not what got assembled.

```bash
ffmpeg -v error -y -i final-16x9.mp4 -vn -ac 1 -ar 16000 -f wav /tmp/a.wav
```

**Find the gaps on the narration track, never by eye.** Guessing a "gap" window
from the block boundaries measures speech and tells you nothing — it happened
twice on 2026-08-05 before the method was fixed. Threshold the narration itself:
slide a 200 ms window over it, keep every position under about −55 dBFS, merge
the neighbours, and drop anything shorter than 0.30s. Those are the real gaps.
Then read the **final file** in exactly those windows.

A gap reading near **−99 dBFS is digital silence: the bed is gone.** A healthy
gap sits roughly 25 to 45 dB below the speech segments. Restore it with
`scripts/restore-sound-bed.py`, which rebuilds the bed from the clips' own audio
and ducks it under the assembled voice with `sidechaincompress`. Free, and it
re-times nothing, because assembly already positioned the voice.

Verified by measurement on a real run, 2026-07-30.

**Two things that make the bed inaudible even when it is present**, both
measured 2026-08-05 and both fixed in `restore-sound-bed.py`:

- **Generators return wildly different levels per clip.** On one run the five
  clips spanned **17 dB**, from −23.4 to −40.7 dBFS mean. A single global bed
  gain cannot serve that: the loud clip fights the voice while the quiet one is
  gone. Normalise **each clip** to a common mean before mixing, and take the gain
  as `min(target − mean, headroom − peak)` so a clip with hot transients is never
  pushed into clipping. Measure it at build time rather than hardcoding — then
  re-rolling one clip cannot silently break the mix.
- **The duck release must be shorter than the gaps.** With `release=420` and
  gaps of 0.30–0.45s, the bed never recovers between phrases and sits ~29 dB
  under the voice for the whole film. Measure the gaps first, then set the
  release below the shortest one. 260 ms suited a narration whose gaps ran
  0.30–0.45s.

**Do not confuse a loud opening with a loud bed.** A high reading over the first
half-second is usually the narration itself: TTS often starts speaking at t=0
with no lead-in, so there is no pre-roll to measure. Check the narration track
before blaming the mix.

### Then, one frame from each clip — six things

1. **The style holds across all N.** Same palette, same texture, same line
   weight. If block 3 looks like a different show, the key did not attach.
2. **The through-line object appears in every block**, and escalates.
3. **No garbled or duplicated text.** AI lettering doubles and misspells; this
   is the single most common defect. **Read it at full resolution.** A contact
   sheet at 150–180 px wide makes clean lettering look garbled and will send you
   re-rolling a clip that was fine — pull one full-size frame before deciding.
4. **The burned captions are not covering a generated prop.** Stamped numbers,
   price tags and labels live in the lower third, and so does the caption band:
   they collide by default. On 2026-08-05 the band sat exactly on a `30 000`
   card and hid it for the whole shot — nothing was wrong with the render, the
   defect was ours. Pull a frame at each prop moment, read off the prop's y
   range, and move the band clear of it. Then check the band is still above the
   platform UI, which eats roughly the bottom 150 px on Reels and TikTok.
5. **The aspect is what was ordered.** If the clips came back 16:9 on a 9:16
   brief, you skipped the explicit `aspect_ratio`.
6. **Every real subject actually looks like itself.** Open the Phase A reference
   beside the frame and compare feature by feature. "It is the right ethnicity
   and wearing a suit" is not a likeness. If the eyewear, hair or build is wrong,
   the clip shows a stranger and the block needs re-rendering with the features
   named harder and their opposites in the NEGATIVE line.

**A block carrying a real person almost never lands first time.** Budget one
re-render per such block when quoting, rather than discovering it after the gate.

Fix and re-render what is broken before delivering. Re-running one block costs
30 credits; shipping a broken video costs the whole run.

## Delivery

Final message: the path to `final.mp4`, the topic and angle in one sentence, the
full script so it can be reused, the Sources list, and **actual credits spent
versus the estimate**. Then offer, do not run, `yt-publish` for titles and
description if it is headed to YouTube.

## Repeat runs

- **Another language:** reuse every clip job id and the style key, re-voice all N
  blocks in the new language, re-assemble with `explainer_video`. Only the voice
  cost repeats (~0.6 cr per block). Write it to `final-<lang>.mp4` in the same
  folder.
- **One bad scene:** re-run that block's clip only, swap its job id in the
  manifest, then re-assemble. Everything else is already paid for.

## Failure handling

- **Clip drifts off-style or renders photoreal** → strengthen the shared STYLE
  and NEGATIVE text, re-run that block only. Two identical failures means the
  prompt is wrong, not the seed.
- **Take longer than ~9.5s** → shorten the line or raise `speech_rate`, re-voice
  that block only.
- **Voice id errors** → you skipped `list_voices`. Call it and reuse one exact
  `voice_id` plus `voice_type` everywhere.
- **Job `failed` or `nsfw` with no error text** → moderation, not bad luck. See
  the moderation map in `references/style-paper-diorama.md`: named politicians
  and close-up recognizable faces fail, mid-shot descriptions pass, and
  "mushroom cloud" flags nsfw. Swap the image, keep the idea.
- **`nsfw` on a block that passed a real person's photo as a reference** → the
  likeness guardrail, and it is working as intended. **Do not reword around it
  and do not try another model.** Drop the photo, keep the accurate text
  description from Phase A, resubmit. Verified on a real run, 2026-07-30.
- **A job hangs in `in_progress` well past its normal time** → assembly is under
  a minute and clips are one to three; ten times that is stuck, not slow.
  Resubmit rather than keep polling. Verified 2026-07-30, when one assembly sat
  for twenty minutes and an identical resubmission returned in seconds.
- **A job comes back still running** → re-read it with `job_display(id)`, or
  `show_generations` to find it. Never duplicate a running job.
- **Model id rejected** → confirm with `models_explore(type: "video")`. Never
  silently downgrade to a cheaper photoreal model.
- **Out of credits** → stop and report the exact shortfall.
- **MCP tools missing mid-run** → the connection dropped. `/mcp` to reconnect,
  then resume from the manifest; do not re-pay for jobs already recorded there.
