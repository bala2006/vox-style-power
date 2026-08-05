#!/usr/bin/env python3
"""
Restore the Seedance sound bed that `explainer_video` discards.

THE BUG. `explainer_video` does not mix a block's voice take under the clip's
own audio. It REPLACES it. Its tool description says so outright ("Omit or set
null to keep the clip's own audio"), so passing `audio` throws the clip's
soundtrack away. The vendored workflow's claim that Seedance's "native audio bed
survives assembly under the voiceover" is wrong, and it is wrong in a way that is
invisible unless you measure: the assembled file still has an audio stream, still
has correct duration, and still plays the narration.

Measured on this run: raw clip 1 sits at -21.7 dBFS with rain, thunder and score.
The same 0.7s of the assembled cut, before narration starts, is -99 dBFS. Digital
silence. Every 10s block is voice-only with dead air around it.

THE FIX. Everything needed is already on disk and already paid for. Take the nine
clips' own audio as the bed, take the assembled file's audio as the voice (it is
already positioned correctly by the assembly's timing contract, so nothing has to
be re-derived), duck the bed under the voice with sidechaincompress, and remux.

No credits are spent. Nothing is re-generated.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
BLOCK_SECONDS = 10.0

BED_GAIN_DB = -7          # bed sits this far down before ducking
DUCK_THRESHOLD = 0.025    # voice level that starts ducking the bed
DUCK_RATIO = 9
DUCK_ATTACK_MS = 15

# RELEASE MUST BE SHORTER THAN THE GAPS BETWEEN PHRASES, or the bed never gets
# back up and the whole film plays with it ~29 dB under the voice — present in
# the file, inaudible to the viewer. Narration gaps run 0.30-0.45s in practice,
# so 420 was longer than every one of them. Measured and fixed 2026-08-05.
DUCK_RELEASE_MS = 260

# Generators return wildly different levels per clip: on one measured run the
# five clips spanned 17 dB, -23.4 to -40.7 dBFS mean. A single global gain cannot
# serve that — the loud clip fights the voice while the quiet one disappears. So
# each clip is brought to a common mean BEFORE the bed is concatenated, and the
# gain is measured here rather than hardcoded, so re-rolling one clip cannot
# silently break the mix.
BED_TARGET_DB = -32.0     # common mean for every clip's contribution
BED_HEADROOM_DB = -1.0    # never push a hot transient into clipping

WORK = ROOT / ".sound"


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def clip_gain(clip: Path) -> float:
    """dB to apply so this clip's bed sits at the common level, without clipping.

    Taking the stricter of "reach the target mean" and "stay under the peak
    ceiling" is what stops a clip with loud transients — a door slam, a stamp —
    from being pushed into distortion while its quiet passages are lifted.
    """
    err = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(clip), "-vn",
         "-af", "volumedetect", "-f", "null", "/dev/null"],
        capture_output=True, text=True).stderr
    mean = float(re.search(r"mean_volume: (-?[\d.]+)", err).group(1))
    peak = float(re.search(r"max_volume: (-?[\d.]+)", err).group(1))
    return round(min(BED_TARGET_DB - mean, BED_HEADROOM_DB - peak), 2)


def build_bed(blocks: list[dict]) -> Path:
    """Concatenate every clip's own audio, levelled, each trimmed to one block."""
    WORK.mkdir(exist_ok=True)
    parts = []
    for b in blocks:
        clip = ROOT / f"clips/block-{b['n']:02d}.mp4"
        out = WORK / f"bed-{b['n']:02d}.wav"
        g = clip_gain(clip)
        print(f"  bed {clip.name}: {g:+.2f} dB")
        # trim to exactly 10.000s, pad if the render came back a hair short,
        # so nine segments concatenate to exactly 90.000s with no drift
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(clip), "-vn",
             "-af", f"volume={g}dB,apad,atrim=0:{BLOCK_SECONDS},asetpts=N/SR/TB",
             "-ac", "2", "-ar", "48000", str(out)])
        parts.append(out)

    listing = WORK / "beds.txt"
    listing.write_text("".join(f"file '{p.name}'\n" for p in parts))
    bed = WORK / "bed.wav"
    run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
         "-i", str(listing), "-c", "copy", str(bed)])
    return bed


def mix_onto(video: Path, bed: Path, out: Path) -> None:
    """Duck the bed under that video's existing (voice-only) track and remux."""
    voice = WORK / f"voice-{video.stem}.wav"
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(video), "-vn",
         "-ac", "2", "-ar", "48000", str(voice)])

    chain = (
        f"[0:a]volume={BED_GAIN_DB}dB[bed];"
        f"[1:a]asplit=2[vc][vk];"
        f"[bed][vk]sidechaincompress="
        f"threshold={DUCK_THRESHOLD}:ratio={DUCK_RATIO}:"
        f"attack={DUCK_ATTACK_MS}:release={DUCK_RELEASE_MS}[ducked];"
        f"[ducked][vc]amix=inputs=2:duration=longest:"
        f"dropout_transition=0:normalize=0[mixed]"
    )
    run(["ffmpeg", "-loglevel", "error", "-y",
         "-i", str(bed), "-i", str(voice), "-i", str(video),
         "-filter_complex", chain,
         "-map", "2:v", "-map", "[mixed]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-shortest", str(out)])


def main() -> None:
    blocks = json.loads((ROOT / "manifest.json").read_text())["blocks"]
    bed = build_bed(blocks)
    for name in sys.argv[1:] or ["final-16x9.mp4", "final-9x16.mp4"]:
        src = ROOT / name
        tmp = ROOT / f".{name}"
        mix_onto(src, bed, tmp)
        tmp.replace(src)
        print(f"sound bed restored -> {name}")


if __name__ == "__main__":
    main()
