# Prompt pack — the manual fallback

Eight hand-pasteable prompts covering everything this skill does, rewritten so
**every blank sits at the top of the prompt**, never buried inside a sentence.
Fill the `ANSWERS` header, paste the whole block, walk away.

## When to use this file

**Not inside this project.** Here, the skill does all eight jobs — better, because
it also carries the approval gate, the free `get_cost` preflight, the
`declined_preset_id` workaround, the `aspect_ratio` fix, moderation handling, and
resume-from-manifest. A pasted prompt has none of that. Type `/vox-style` instead.

This file is for **anywhere the skill is not installed**: a bare claude.ai tab,
a colleague's machine, a phone. It is the escape hatch, and it is also the
plain-English record of what each mode is trying to do — useful when tuning the
skill itself.

| # | Prompt | Skill equivalent |
|---|---|---|
| 01 | The flagship: topic → finished video | Mode A, `SKILL.md` Phases T–6 |
| 02 | Build a permanent style key | Mode B, `modes.md` |
| 03 | Paper-diorama documentary | Mode A with `style=diorama` |
| 04 | News radar: find today's story | Mode C, `modes.md` |
| 05 | Narrate in your own cloned voice | Voice mode C, `SKILL.md` |
| 06 | Explain your own business | Mode D, `modes.md` |
| 07 | Turn one video into a series | Mode E, `modes.md` |
| 08 | Fix the pacing of an existing video | The assembly timing contract, `SKILL.md` |

Where a prompt and the skill disagree, **the skill wins** — it is the version
that gets corrected after real runs.

---

## Your profile — fill this in once

Every prompt's `ANSWERS` header pulls from here. Fill it once, keep it in a note,
paste it above any prompt that references it.

```
MY PROFILE
  NICHE:            e.g. AI and the money moving through it
  AUDIENCE:         e.g. builders and operators who are not engineers
  ANGLE:            e.g. follow the money / what nobody is telling you
  BRAND COLORS:     e.g. ink navy, brick red, warm cream   (or: you choose)
  HOUSE STYLE:      newsroom | mixed-media | diorama
  ASPECT:           9:16
  LENGTH:           1 minute = 6 blocks
  VOICE:            deep, measured documentary narrator
```

**House defaults these prompts assume** (they match the skill, change them in the
header if you want something else): 9:16 vertical, six blocks of ten seconds,
`newsroom` style, subtitles on in `anton`, faceless, English.

**Budget:** a one-minute run on `gemini_omni` is about 184 credits clean.
**Quote yourself 200 to 250** — one re-voice round and one re-rendered block are
normal, not failure. `seedance_2_0` is 45 credits per clip at 720p, so a diorama
run is about 275. Voice is 0.6 credits a block, assembly is free.

---

## Prompt 01 · The flagship

**One story in, one finished video out.**

> **SKILL EQUIVALENT: mode A**, `SKILL.md` Phases T–6. Inside this project type
> `/vox-style <topic>` instead — it does everything below plus the approval gate
> and the free credit preflight.

```
ANSWERS
  TOPIC:            
  ASPECT:           9:16
  BLOCKS:           6
  STYLE:            newsroom
  SUBTITLES:        on, anton
  ENGINE:           gemini_omni

THE JOB: Build a complete sixty-second Vox-style motion-graphics explainer on the
topic above. Work autonomously end to end: research, script, style, clips,
narration, assembly. Do not stop at a plan and do not hand me loose clips. The
deliverable is ONE finished MP4 with narration, music, sound effects and burned-in
subtitles, at the aspect above.

STEP 1, RESEARCH: Search the web for the real facts. Cross-check every number
against at least two independent sources and list them at the end. Where a number
is disputed, use the conservative figure. Never invent a statistic. A vague true
line beats a specific false one.

STEP 2, SCRIPT: Write exactly the number of narration blocks above, each 20 to 24
words, about nine spoken seconds. Block 1 is a cold open on the single most
surprising real number, stated flat. Block 2 is the stakes. The middle blocks
carry one idea each, anchored to a concrete number, date or place, escalating.
The second-to-last block is the turn, the thing that reverses what the viewer
assumed. The last block lands the meaning and pays off the through-line object.

Write for the synthesizer, not the page. A period costs about 0.7 seconds of
silence, so use commas where you want pace and save periods for beats you
actually want to land. Spell numbers as words. No em dashes anywhere. No jargon,
no throat-clearing, no "in today's video", no direct address. The narrator
explains, never hypes.

STEP 3, THE THROUGH-LINE OBJECT: Before generating anything, choose ONE physical
object that appears in all six scenes and escalates each time. A paper box going
sealed to broken to rebuilt. A fuse burning across every scene. A balloon pumped
toward a needle. Tell me what it is in one line. Every scene description must
feature it. This is what makes sixty seconds feel like a film instead of a
slideshow, and it is the part almost everyone leaves out.

STEP 4, STYLE KEY: Generate ONE reference image at the aspect above with the best
available image model: "Flat-lay style reference sheet photographed from directly
above, paper cut-out collage on warm cream cardstock, torn kraft paper edges,
halftone dot texture, hand-drawn ink circles and underlines, muted sepia and
brick-red and ink-navy palette, editorial magazine illustration, no text, no
watermark." Show it to me, then attach this SAME image as a reference on EVERY
clip you generate. A clip generated without it is a defect, not a variation.

STEP 5, CLIPS: Generate one ten-second clip per block, each paper cut-outs moving
on the cream background with snappy camera pushes, hand-cut arrows, growing paper
bar charts and maps.

Pass the aspect ratio explicitly on every single clip. Do not assume the clip
inherits framing from the reference image, because it does not, and believing
otherwise silently ruins the whole batch.

Write each clip as one continuous camera move that begins and ends in motion
blur, so hard cuts between blocks read as one unbroken shot. Land an impact every
three seconds or so. Alternate extreme macro against wide.

Hard limits: a MAXIMUM of three text elements per scene and four words in any
title, or the model duplicates words and garbles spelling. Add the negative
prompt "repeated text, doubled text, two lines of identical text, dark
background, photorealistic, 3D render, live action, human faces, lip-sync,
captions, logos, watermark". Never a filmed scene, always a motion-designed
magazine spread.

STEP 6, NARRATION: Generate the narration with the voice above, all blocks before
you start any clips. This order is strict: each take's real duration is what tells
you whether a line needs shortening before you spend money on its clip.

Read each take's real duration and target 9.0 to 10.5 seconds. The block window is
a fixed ten seconds, so a seven-second take gets centered and starts late enough to
read as desync, and a thirteen-second take gets squeezed and reads as rushed. A
slight overrun beats a late start. Word count does not predict duration: the same
twenty-two words can differ by four seconds depending on punctuation. Expect a
re-voice round.

Trim leading and trailing silence off every audio file before you use it. Three
seconds of dead air at the front buries the hook and it is invisible until you
watch the finished cut.

STEP 7, ASSEMBLE: Cut the clips in order, place each narration line 0.4 seconds
after its cut so the viewer gets a beat to read the new image, leave natural
half-second gaps between lines, add a music bed at low volume ducked under the
voice, keep the clips' own sound effects quiet underneath, and burn in subtitles
in a bold condensed sans, no more than two lines at a time, timed to the trimmed
audio. Export at the aspect above.

VERIFY BEFORE YOU CALL IT DONE: Extract a frame from every clip and check four
things. One, the style holds across all of them: same palette, same texture, same
line weight. If one block looks like a different show, the key did not attach.
Two, the through-line object appears in every scene and escalates. Three, no text
is duplicated or misspelled, which is the single most common defect. Four, the
aspect is what I ordered. Fix and re-render anything broken, then give me the
file path, the runtime, the credits spent, and the source list.
```

---

## Prompt 02 · The look

**Build a style key you keep forever.**

> **SKILL EQUIVALENT: mode B**, `modes.md`. Say "build me a style key". The
> skill version also writes a style bible to `styles/<name>.md` and proves the
> look holds under animation before you commit.

```
ANSWERS
  TOPIC AREA:       
  FEELING:          bright and playful editorial | dark and cinematic
                    | warm and archival | neon and technical
  BRAND COLORS:     from MY PROFILE, or: you choose
  ASPECT:           9:16
  PROPS THAT RECUR: list 6 to 8, e.g. a server rack, a coin stack, a stopwatch,
                    a document, a chart, a globe, a lightning bolt
  TEST SCENE:       one simple scene from my topic area

THE JOB: I am starting a motion-graphics explainer series and I need a permanent
visual identity. Build me a STYLE KEY: one reference image I will attach to every
clip of every future episode so the whole series looks like one show.

STEP 1: Propose THREE different visual directions in words before generating
anything. For each, give me the background material, the palette in three to four
named colors, the texture, and one line on why it fits my topic area. Number them
and stop.

STEP 2, once I choose: Generate the style key at the aspect above with the best
available image model, composed as a flat-lay reference sheet photographed from
directly above. It must contain the recurring props listed above as cut-outs laid
out on the background material, so future clips have something to copy. Include a
small swatch strip of the palette in one corner. Absolutely no text and no
watermark anywhere in the image.

STEP 3: Show it to me. If I say it is not right, regenerate with my note; do not
defend the first one. When I approve it, save the image locally, tell me the exact
file path and the generation job id, and write me a short STYLE BIBLE in plain
text I can paste into future prompts: the background material, the palette hex
codes, the texture rules, the lighting, the camera behavior, and the negative
prompt to use every time.

STEP 4, PROVE IT WORKS: Generate ONE test ten-second clip using this style key as
an image reference, showing the test scene above. Pass the aspect explicitly.
Extract three frames and show me, so I can confirm the style holds under animation
before I commit to a whole episode.

RULES: The style key must be reusable for hundreds of clips, so keep it generic
enough to cover any story in my topic area but specific enough that the palette
and texture are unmistakable. Avoid anything trendy that will look dated in six
months. No faces, no logos, no real brands.
```

---

## Prompt 03 · The cinematic cousin

**The paper-diorama documentary.**

> **SKILL EQUIVALENT: mode A with `style=diorama`.** The skill also routes this
> style to `seedance_2_0` automatically and carries the moderation map for what
> gets flagged.

```
ANSWERS
  TOPIC:            
  ASPECT:           9:16
  BLOCKS:           6
  ENGINE:           seedance_2_0
  ACCENT COLOR:     burnt orange

THE JOB: Build a sixty-second PAPER-DIORAMA DOCUMENTARY explainer on the topic
above. This is not the flat collage look. This is a cinematic miniature world made
of newsprint and cardboard, filmed as one continuous flight. Work autonomously end
to end and deliver ONE finished MP4 with narration, sound and burned-in subtitles.

THE LOOK: Tiny handmade dioramas built from aged sepia newsprint, corrugated
cardboard and torn paper, lit like a film set with hard directional light and deep
shadows. Everything is monochrome newsprint EXCEPT one single accent color, the
one above, which appears only on the object that matters in each scene. Figures
are faceless paper cut-outs with censor bars where faces would be.

THE CAMERA: Every clip is a fake one-take. One continuous first-person flight
through the diorama, starting and ending in motion blur so the clips cut together
as if the camera never stopped moving. Fly through doorways, under bridges,
between buildings. Never a static shot. Use a speed ramp in every block.

STEP 1, RESEARCH: Search the web and cross-check every fact against at least two
sources. List them at the end. Conservative figures only, no invented numbers.

STEP 2, SCRIPT: Six narration blocks, 20 to 24 words each, about nine spoken
seconds. Block 1 hooks on the biggest real number. Blocks 2 to 4 escalate. Block 5
is the turn. Block 6 lands the meaning. Write for the ear: commas for pace,
periods only where you want a real pause, numbers spelled as words, no em dashes.
Then choose ONE object in the accent color that rides through all six dioramas and
escalates each time, and tell me what it is.

STEP 3, LABELS: Write six short labels, one per scene, THREE WORDS MAXIMUM each,
that will be letterpress-printed on a prop inside the shot. The last one should be
the question the whole video is built around. This style is the one deliberate
exception to the no-text rule, and it only survives because the limits are tight:
one label per scene, three text elements maximum in frame.

STEP 4, STYLE KEY: Generate one reference image at the aspect above: "Miniature
paper diorama built from aged sepia newsprint and torn cardboard, photographed
with hard cinematic side lighting and deep shadows, monochrome newsprint tones
with a single burnt orange paper accent, faceless paper cut-out figures with black
censor bars, tilt-shift miniature depth of field, no text, no watermark." Attach
this same image as a reference on all six clips.

STEP 5, CLIPS: Six ten-second clips, one per block, each a continuous flight
through that scene's diorama, each featuring the through-line object and that
scene's letterpress label on a prop. Pass the aspect explicitly on every clip.
Negative prompt: "floating text, subtitles, watermark, repeated text, doubled
text, photorealistic humans, faces, color photography, bright saturated colors".

If the server intercepts the submission with a preset recommendation, never accept
it. Resubmit with the decline id it hands back, and keep the literal prompt.

STEP 6, NARRATION: A deep, measured documentary narrator, the kind that reads a
war report. All six takes before any clips. Target 9.0 to 10.5 seconds per line.
Trim silence off every take.

STEP 7, ASSEMBLE: Cut in order, narration 0.4 seconds after each cut, tense low
music bed ducked under the voice, keep the clips' own ambience quiet underneath,
burn in subtitles in a bold condensed sans. Export at the aspect above.

VERIFY: Extract a frame from each clip. Confirm every scene reads as newsprint
with exactly one accent-colored element, confirm each label rendered correctly on
a prop and is not misspelled, confirm the through-line object appears six times.
Fix and re-render before delivering.
```

---

## Prompt 04 · No topic needed

**The news radar.**

> **SKILL EQUIVALENT: mode C**, `modes.md`. Say "find me a story". The skill
> version stops at the pitch, then flows straight into mode A on the winner
> without re-researching what it already verified.

```
ANSWERS
  NICHE:            from MY PROFILE
  AUDIENCE:         from MY PROFILE
  ANGLE:            from MY PROFILE
  WINDOW:           last 7 days
  BUILD IT?:        no, pitch only   (change to "yes" to go straight through)

THE JOB: I want to publish an explainer today and I do not have a topic. Find me
one, then stop.

STEP 1, SCAN: Search the web for stories in my niche inside the window above. You
are looking for stories that satisfy ALL FOUR of these tests, because these are
what make a story explainable in sixty seconds:

  1. There is one hard NUMBER that is genuinely surprising.
  2. There is a TWIST: the obvious interpretation is wrong.
  3. It can be shown with OBJECTS rather than talking heads.
  4. It actually matters to my audience's money, safety or work.

Reject anything that fails one of the four, no matter how big the headline is.
Also skip breaking tragedies, active disasters, celebrity gossip with no data
angle, and anything you cannot verify against two independent sources.

STEP 2, PITCH: Give me exactly THREE candidates. For each one, in no more than six
lines: the headline in plain words, the surprising number, the twist in one
sentence, the through-line object you would use, and a score out of ten for how
well it will perform. Rank them, tell me which one you would pick and why. Then
STOP and wait for me to choose.

STEP 3, VERIFY BEFORE YOU BUILD: Once I pick, cross-check every fact in that story
against at least two independent, named sources. If the central number does not
hold up, say so immediately and offer me the runner-up instead of building on a
shaky fact. Reputation is worth more than an episode.

STEP 4, HAND OFF: If BUILD IT is "no", hand me the verified brief: topic, angle,
the hook number with both sources, the twist, and the through-line object, in a
form I can paste straight into the vox skill. If BUILD IT is "yes", produce the
complete explainer following the standard recipe in prompt 01.

STEP 5, PACKAGE IT: Either way, give me three title options, a caption written in
plain conversational language with no em dashes and no mention of AI, five
hashtags, and the source list so I can defend every number if someone asks.
```

---

## Prompt 05 · Your voice

**Narrate it yourself, without recording.**

> **SKILL EQUIVALENT: Voice mode C**, `SKILL.md`. Clone once with `create_voice`,
> put the id and `element` in `.env` as `VOX_VOICE_ID` and `VOX_VOICE_TYPE`, and
> every future run is in your voice with zero effort.

```
ANSWERS
  TOPIC:            
  ASPECT:           9:16
  BLOCKS:           6
  SAMPLE READY?:    no

THE JOB: I want my explainer series narrated in MY OWN voice. Set up the voice
clone first, then use it to build a full episode on the topic above.

STEP 1, THE CLONE: Walk me through creating a voice clone. Tell me exactly what
audio sample you need from me: how long, what to say, what to avoid, and what
recording conditions matter. Wait for me to provide it. Once the voice exists,
save the voice id and repeat it back to me in plain text so I never lose it.

STEP 2, CALIBRATE, do not skip this: Before building anything, generate ONE test
line of about twenty words in my cloned voice and measure how many seconds it
runs. Cloned voices almost always read slower than you expect, and that is what
wrecks the timing of a whole episode. Report the seconds and the words per second.
Then tell me the exact speech rate setting and target word count per line that
lands a block between 9.0 and 10.5 seconds, and use those numbers for every line
from here on.

STEP 3, WRITE FOR MY MOUTH: Write the narration blocks using the word count you
just calculated. Use commas where you want pace and periods only where you
genuinely want a dramatic pause, because a period costs about 0.7 seconds of
silence in synthesized speech. No em dashes. Read each line back and cut any word
a real person would not say out loud.

STEP 4, CLEAN EVERY TAKE: After generating each narration line, check for silence
at the start and end of the audio and trim it off before use. A single take with
four seconds of dead air at the front will bury the hook, and it is invisible
until you watch the final cut.

STEP 5, BUILD: Produce the full explainer with the standard recipe from prompt 01:
facts cross-checked against two sources, one through-line object in every scene,
one style key attached as a reference to every clip, ten-second clips at a maximum
of three text elements each, aspect passed explicitly on every clip, assembly with
narration 0.4 seconds after each cut, music ducked under the voice, subtitles
burned in.

STEP 6, MIX FOR VOICE: My voice is the star, so mix it forward and everything else
back. Bring the narration up until it clearly sits on top, keep the music quiet
enough that it never competes, keep the clips' sound effects lower still, and put
a limiter on the final mix so nothing clips. Tell me the levels you used so I can
reuse them next time.

DELIVER: ONE finished MP4 plus the voice id, the speech rate, the target word
count, and the mix levels written out, so episode two takes half the time.
```

---

## Prompt 06 · The money one

**Explain your own business.**

> **SKILL EQUIVALENT: mode D**, `modes.md`. Say "make a video about my business".
> The skill version also re-assembles the same clips at a second aspect for
> free, since `explainer_video` costs nothing to re-run.

```
ANSWERS
  WHAT I DO:        one line
  WHO IT IS FOR:    
  THE PAIN:         in their words, not mine
  WHAT I DELIVER:   the offer
  PROOF:            real numbers, results or timeframes
  CALL TO ACTION:   
  BRAND COLORS:     from MY PROFILE
  ASPECT:           9:16, plus a 16:9 reframe
  BLOCKS:           6

THE JOB: Build me a sixty-second explainer about my business, the kind that makes
a stranger understand what I do and want it. Work end to end and deliver ONE
finished MP4.

STEP 1, FIND THE STORY, do not skip to the script: Explainers sell because they
explain a PROBLEM, not a product. Before writing anything, tell me in five lines
what the real, specific, expensive problem is that my customer lives with, why the
usual solutions fail them, and what the one surprising truth is that reframes it.
If what I gave you is too vague to build on, ask me up to three sharp questions
and wait.

STEP 2, SCRIPT: Six blocks of 20 to 24 words. Block 1 opens on the PROBLEM at its
most painful, with a real number if I gave you one. Block 2 shows what it costs
them to keep living with it. Block 3 is the reframe, the surprising truth. Block 4
is how the fix actually works, in plain language, no feature lists. Block 5 is
proof, using only numbers I gave you, never invented ones. Block 6 is the call to
action, one clear instruction.

Never use the words "solution", "innovative", "seamless", "leverage" or
"revolutionize". No em dashes. Numbers spelled as words.

STEP 3, THE OBJECT: Choose ONE physical object that represents my customer's
problem and physically transforms across the six scenes: tangled to straight,
heavy to light, scattered to stacked, closed to open. Tell me what it is before
you generate anything.

STEP 4, STYLE: Generate one style key as a flat-lay paper cut-out reference sheet
using my brand colors above, and attach it as an image reference on all six clips
so the video looks like it belongs to my brand.

STEP 5, CLIPS AND VOICE: Six ten-second clips, one per block, featuring the
transforming object, maximum three text elements per scene and four words per
title. Pass the aspect explicitly on every clip. Narration in a warm, credible,
non-salesy voice at 9.0 to 10.5 seconds per line, all takes generated before any
clips, silence trimmed off every take.

STEP 6, ASSEMBLE AND DELIVER: Cut in order, narration 0.4 seconds after each cut,
music ducked under the voice, subtitles burned in. Then give me the same video
reframed to the second aspect above, plus three caption options and a version of
the script I can read on camera myself.
```

---

## Prompt 07 · The compounding one

**Turn one video into a series.**

> **SKILL EQUIVALENT: mode E**, `modes.md`. Say "turn this into a series". The
> skill version writes the bible, slate and checklist into `series/<name>/` and
> gates all four artifacts together instead of four separate times.

```
ANSWERS
  NICHE:            from MY PROFILE
  AUDIENCE:         from MY PROFILE
  PUBLISH RATE:     e.g. twice a week
  EPISODES WANTED:  e.g. 8, enough for one month
  STYLE KEY:        file path, or: build me one
  BUILD EPISODE 1?: yes

THE JOB: I have made one explainer and I want to turn it into a real series. Build
me the system, not another one-off.

STEP 1, THE SERIES BIBLE: Write me a one-page bible in plain text covering: the
series name and what it promises in one sentence; the ONE question every episode
answers; the visual rules that never change (background, palette, texture, camera
behavior, negative prompt); the narration rules (voice, pace, target seconds per
block, words per line); the structural rules (six blocks, hook, escalation, turn,
meaning, one through-line object); and the three things that are allowed to change
episode to episode. This document is the thing that makes episode twenty look like
episode one.

STEP 2, THE OPEN AND CLOSE: Design a two-second title treatment and a three-second
end card that appear in every episode, described precisely enough that I can
regenerate them identically forever. Consistent bookends are the cheapest way to
feel like a real show.

STEP 3, THE SLATE: Search the web for what is actually happening in my niche right
now and pitch me the number of episodes above. For each: working title, the
surprising number it hangs on, the twist, the through-line object, and a score out
of ten. Rank them by how well they will perform and mark which one should go
first and why. Kill any idea that has no hard number or no twist, and say so.

STEP 4, THE PRODUCTION CHECKLIST: Write me a numbered checklist of every step to
produce one episode, with the exact settings that worked, so I or an assistant can
run it without thinking. Include the failure points and the fix for each: style
drift, duplicated text in clips, narration running long, silence at the head of a
take, clips coming back in the wrong aspect, generation jobs that hang.

STEP 5, BUILD EPISODE ONE: If the answer above is yes, produce the top-ranked
episode as a complete finished MP4 using the bible you just wrote. Follow the
recipe exactly: cross-checked facts with named sources, six blocks, through-line
object in every scene, style key attached to every clip, aspect passed explicitly,
narration timed and silence-trimmed, assembled with the narration 0.4 seconds
after each cut, music ducked, subtitles burned in.

DELIVER: The bible, the slate, the checklist, and episode one as a finished video
with its source list.
```

---

## Prompt 08 · The pro move

**Fix the pacing nobody else fixes.**

> **SKILL EQUIVALENT: the assembly timing contract**, `SKILL.md`. The skill
> already enforces this on every run: fixed ten-second windows, short takes
> centered, overruns compressed pitch-safely, silence trimmed first. Use this
> prompt to repair a video made *somewhere else*.

```
ANSWERS
  CLIPS AT:         
  AUDIO AT:         
  ASPECT:           9:16
  SUBTITLES:        on, bold condensed sans

THE JOB: I have an explainer video that feels stiff and I cannot tell why.
Re-assemble it properly and tell me what was wrong.

THE DIAGNOSIS FIRST: Before touching anything, measure and report the exact
duration of every clip, the exact duration of every narration take, how much
silence sits at the head and tail of each take, and where each narration line
currently starts relative to its cut. Nine times out of ten the problem is one of
four things, and I want you to name which:

  1. Each narration line is centered inside a fixed ten-second window, which
     creates dead air at both ends of every single block.
  2. Takes have baked-in silence at the front, which buries the first words.
  3. The narration starts at the exact instant of the cut, so the viewer never
     gets to see the shot.
  4. The music is one flat loop with no arc, which makes sixty seconds feel like
     three minutes.

NOW FIX IT, in this order:

1. SILENCE: Strip leading and trailing silence off every narration file. Do this
   before anything else, because every timing decision downstream depends on the
   real start of the words.

2. PLACEMENT: Place each narration line about 0.4 seconds AFTER its cut, not on
   it. The viewer needs a beat to read the new image before a voice starts. Leave
   natural gaps of half a second to a second and a half between lines. Do not
   stretch or squeeze audio to fill a window. Let the gaps be uneven; that is
   what real editing sounds like.

3. CLIP LENGTH FOLLOWS AUDIO: If a narration line is shorter than its clip, trim
   the clip. If it is longer, hold the last frame briefly rather than rushing the
   read. The picture serves the voice, never the reverse.

4. MUSIC ARC: Do not use one loop. Use an energetic bed for the opening third, a
   softer bed under the middle where the facts land, then return to the energetic
   bed for the payoff, crossfaded between sections and loudness-matched so the
   switch is invisible. Duck the music under the voice.

5. MIX: Voice clearly on top, music well underneath, the clips' own sound effects
   lower still, and a limiter on the master so nothing clips. Report the exact
   levels you used.

6. SUBTITLES: Burn them in, high contrast, no more than two lines at a time,
   timed to the trimmed audio and not the original.

Then export at the aspect above, and give me a short before-and-after: what the
total dead air was before, what it is now, and what you changed. If nothing was
wrong, say so plainly instead of making changes to look busy.
```

---

## The rules that make all of this work

The eight failure modes worth memorizing. Every one of them is already enforced
inside the skill; they matter when you are pasting prompts by hand.

- **Three text elements per scene. Four words per title. Hard limits.** Push past
  them and the model duplicates words, renders the same line twice, or invents
  spelling. This is the single most common failure and it is entirely avoidable.
  For `newsroom` and `mixed-media`, ban clip text outright and let the burned
  subtitles carry it. `diorama` is the one exception, and even there it is one
  label per scene.

- **The style key goes on every clip, every time.** Six clips generated without a
  shared reference image will look like six different videos. One reference image
  is the whole difference between a series and a pile of clips.

- **Pass the aspect ratio explicitly on every clip.** It does *not* inherit from
  the reference image, whatever the docs say. A 9:16 key still returns 16:9
  clips. Believing otherwise ruins a whole batch silently.

- **Voice before clips, always.** Each take's real duration is what tells you
  whether a line needs shortening before you spend thirty credits on its clip.

- **Trim the silence off every narration take.** Synthesized voices routinely
  come back with seconds of dead air at the front. It buries your hook and you
  will not notice until the video feels slow and you cannot say why.

- **Narration lands after the cut, not on it.** Four tenths of a second. It
  sounds like nothing written down and it is the difference between amateur and
  professional on playback.

- **Write for the ear, not the page.** Twenty to twenty-four words a line.
  Numbers spelled out. Commas for pace, periods for drama, no em dashes. If you
  would not say it out loud to a friend, cut it.

- **Never invent a number.** Two named sources for every figure. One fabricated
  statistic in a video that looks this credible costs more than every video you
  have made.

- **Verify frames before you assemble.** Pull one frame out of each clip and
  actually look at it. Finding a garbled title after the final render costs you
  the whole assembly step twice.

---

*Adapted from the Vox-Style Explainer Prompt Pack (Zubair Trabzada, AI Workshop),
rewritten for this project's defaults: Higgsfield MCP, 9:16 vertical, six
ten-second blocks, `newsroom`/`mixed-media`/`diorama` house styles, server-side
assembly.*
