#!/usr/bin/env python3
"""
Burn correctly-sized captions onto the 9:16 cut.

Why this exists: `explainer_video` lays its captions out for the SOURCE clip
width (1280) and only then center-crops to 720, so any caption wider than the
crop loses its edges. On this run that clipped "straight into QuickBook[s]" and
the CTA "your books at bookzer[o]" — the brand name itself.

So the vertical is assembled WITHOUT server subtitles and captioned here, laid
out for 720 wide from the start. Captions are rendered to RGBA PNGs with PIL and
composited with ffmpeg's overlay filter, because this ffmpeg build ships without
libass, drawtext or the subtitles filter.

Timing follows the assembly contract: every block is a fixed 10s window, a short
take is centered in it, a take longer than the window is compressed to fit. Each
block's line is then split into short phrases timed proportionally by word count.
"""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
BLOCK_SECONDS = 10.0
W, H = 720, 1280

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_SIZE = 38
MAX_CHARS = 22          # wrap width that fits 720 with margin
WORDS_PER_CUE = 4       # phrase length
BASELINE = 0.80         # caption band vertical position

# Real take durations, read from manifest.json (each block's "audio_duration",
# measured off its completed seed_audio job). Falls back to the block window,
# which centres nothing and is only right for takes that fill it.
def load_durations(manifest: dict) -> dict:
    return {b["n"]: b.get("audio_duration", BLOCK_SECONDS) for b in manifest["blocks"]}


def speech_window(n: int, durations: dict) -> tuple[float, float]:
    """Where block n's narration actually sounds inside its fixed 10s window."""
    base = (n - 1) * BLOCK_SECONDS
    dur = durations[n]
    if dur >= BLOCK_SECONDS:
        return base, base + BLOCK_SECONDS          # compressed to fill
    pad = (BLOCK_SECONDS - dur) / 2.0              # short take gets centered
    return base + pad, base + pad + dur


def cues(text: str, start: float, end: float) -> list[tuple[float, float, str]]:
    """Split one block's line into phrases, timed proportionally by word count."""
    words = text.split()
    chunks = [words[i:i + WORDS_PER_CUE] for i in range(0, len(words), WORDS_PER_CUE)]
    # avoid a widow: fold a 1-word tail into the previous chunk
    if len(chunks) > 1 and len(chunks[-1]) == 1:
        chunks[-2] += chunks.pop()
    total = sum(len(c) for c in chunks)
    out, t = [], start
    for c in chunks:
        span = (end - start) * len(c) / total
        out.append((t, t + span, " ".join(c)))
        t += span
    return out


def render_cue(text: str, path: Path) -> None:
    """One caption as a transparent PNG: torn-paper label, heavy black type."""
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    lines = textwrap.wrap(text, width=MAX_CHARS) or [text]

    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    line_h = FONT_SIZE + 10
    widths = [probe.textbbox((0, 0), ln, font=font)[2] for ln in lines]

    pad_x, pad_y = 22, 14
    box_w = min(max(widths) + pad_x * 2, W - 24)      # never exceed the frame
    box_h = line_h * len(lines) + pad_y * 2

    img = Image.new("RGBA", (W, box_h + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0 = (W - box_w) // 2
    d.rounded_rectangle([x0, 6, x0 + box_w, 6 + box_h], radius=5,
                        fill=(247, 244, 236, 255))

    y = 6 + pad_y
    for ln in lines:
        w = probe.textbbox((0, 0), ln, font=font)[2]
        d.text(((W - w) // 2, y), ln, font=font, fill=(17, 17, 17, 255))
        y += line_h

    img.save(path)


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text())
    cue_dir = ROOT / "frames" / "cues"
    cue_dir.mkdir(parents=True, exist_ok=True)

    durations = load_durations(manifest)
    all_cues = []
    for block in manifest["blocks"]:
        n = block["n"]
        start, end = speech_window(n, durations)
        all_cues.extend(cues(block["text"], start, end))

    inputs, filters, labels = [], [], []
    for i, (t0, t1, text) in enumerate(all_cues):
        png = cue_dir / f"cue-{i:03d}.png"
        render_cue(text, png)
        inputs += ["-i", str(png)]
        prev = "[0:v]" if i == 0 else f"[v{i-1}]"
        label = f"v{i}"
        filters.append(
            f"{prev}[{i+1}:v]overlay=x=0:y=H*{BASELINE}:"
            f"enable='between(t,{t0:.3f},{t1:.3f})'[{label}]"
        )
        labels.append(label)

    cmd = [
        "ffmpeg", "-loglevel", "error", "-y",
        "-i", str(ROOT / "final-9x16-nosubs.mp4"), *inputs,
        "-filter_complex", ";".join(filters),
        "-map", f"[{labels[-1]}]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p", "-c:a", "copy",
        str(ROOT / "final-9x16.mp4"),
    ]
    subprocess.run(cmd, check=True)
    print(f"burned {len(all_cues)} cues -> final-9x16.mp4")


if __name__ == "__main__":
    main()
