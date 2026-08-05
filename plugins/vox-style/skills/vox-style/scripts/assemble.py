#!/usr/bin/env python3
"""Assemble a Vox explainer video from per-block clips and voice takes.

Why this exists: the Higgsfield CLI (v1.1.19) exposes no `explainer_video`
assembler job type, so assembly happens locally. This reproduces the timing model
the server-side assembler documents: every block is a fixed window (default 10s),
short voice takes are centered, slight overruns are compressed pitch-safely,
video is never stretched, and total runtime = blocks x block_seconds exactly.

Usage:
    python3 assemble.py path/to/manifest.json [--out final.mp4] [--dry-run]

Manifest shape (paths are relative to the manifest's own folder):

    {
      "slug": "2026-07-29-ai-bubble",
      "aspect": "9:16",              # or "16:9" / "1:1", or set width+height
      "block_seconds": 10,
      "subtitles": true,
      "subtitle_font": "Anton",      # optional, falls back to the system sans
      "music": "audio/music.wav",    # optional
      "music_volume": 0.18,
      "blocks": [
        {"clip": "clips/block-01.mp4",
         "audio": "audio/block-01.wav",
         "text": "Ten companies now make up forty one percent of the index."}
      ]
    }

Only `blocks` is required. Every block needs `clip`; `audio` and `text` are
optional (a block with no audio plays as a silent window).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

# Aspect -> (width, height). Sized to gemini_omni 720p output so the default run
# never upscales. Override with explicit width/height in the manifest.
ASPECTS = {
    "9:16": (720, 1280),
    "16:9": (1280, 720),
    "1:1": (1080, 1080),
}

DEFAULT_BLOCK_SECONDS = 10.0
FPS = 30
# Beyond this the line is simply too long: compressing it reads as rushed.
MAX_TEMPO = 1.35
SUBTITLE_LINE_CHARS = 42


class AssembleError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# Pure helpers (unit-tested in test_assemble.py, no ffmpeg required)
# --------------------------------------------------------------------------


def audio_placement(audio_dur: float, window: float) -> tuple[float, float]:
    """Return (start_offset_seconds, tempo) for one voice take.

    A take shorter than the window is centered so it does not slam against the
    cut. A take longer than the window is sped up pitch-safely to fit, capped at
    MAX_TEMPO so a badly overrun line fails loudly instead of sounding rushed.
    """
    if audio_dur <= 0:
        return 0.0, 1.0
    if audio_dur <= window:
        return round((window - audio_dur) / 2.0, 3), 1.0
    tempo = audio_dur / window
    if tempo > MAX_TEMPO:
        raise AssembleError(
            f"voice take is {audio_dur:.1f}s for a {window:.0f}s window "
            f"(tempo {tempo:.2f} > {MAX_TEMPO}). Shorten the line and re-voice "
            f"that block rather than compressing it."
        )
    return 0.0, round(tempo, 4)


def chunk_caption(text: str, max_chars: int = SUBTITLE_LINE_CHARS) -> list[str]:
    """Split one narration line into readable on-screen chunks."""
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = word
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def srt_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    millis = int(round(seconds * 1000))
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def build_srt(cues: list[tuple[float, float, str]]) -> str:
    """cues = [(start, end, text)] in absolute seconds."""
    out = []
    for index, (start, end, text) in enumerate(cues, start=1):
        out.append(
            f"{index}\n{srt_timestamp(start)} --> {srt_timestamp(end)}\n{text}\n"
        )
    return "\n".join(out)


def caption_cues(
    text: str, window_start: float, speech_start: float, speech_dur: float
) -> list[tuple[float, float, str]]:
    """Spread a block's caption chunks across the time its voice take plays.

    Chunks are weighted by character count, so a long chunk holds longer than a
    short one. With no voice take the block gets no captions.
    """
    chunks = chunk_caption(text)
    if not chunks:
        return []
    if speech_dur <= 0:
        return []
    total_chars = sum(len(chunk) for chunk in chunks) or 1
    cues: list[tuple[float, float, str]] = []
    cursor = window_start + speech_start
    for chunk in chunks:
        span = speech_dur * (len(chunk) / total_chars)
        cues.append((round(cursor, 3), round(cursor + span, 3), chunk))
        cursor += span
    return cues


def resolve_size(manifest: dict) -> tuple[int, int]:
    width, height = manifest.get("width"), manifest.get("height")
    if width and height:
        return int(width), int(height)
    aspect = manifest.get("aspect", "9:16")
    if aspect not in ASPECTS:
        raise AssembleError(
            f"unknown aspect {aspect!r}; use one of {sorted(ASPECTS)} "
            f"or set explicit width and height"
        )
    return ASPECTS[aspect]


# --------------------------------------------------------------------------
# ffmpeg plumbing
# --------------------------------------------------------------------------


def require_binaries() -> None:
    for binary in ("ffmpeg", "ffprobe"):
        if shutil.which(binary) is None:
            raise AssembleError(
                f"{binary} not found on PATH. Install it with `brew install ffmpeg`."
            )


def run(cmd: list[str], cwd: Path | None = None) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if result.returncode != 0:
        tail = "\n".join(result.stderr.strip().splitlines()[-15:])
        raise AssembleError(f"command failed: {' '.join(cmd[:6])} …\n{tail}")


def has_filter(name: str) -> bool:
    """Not every ffmpeg build ships every filter. Burning subtitles needs libass."""
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True
    )
    return any(
        line.split()[1:2] == [name]
        for line in result.stdout.splitlines()
        if len(line.split()) > 1
    )


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise AssembleError(f"could not read duration of {path}")
    return float(result.stdout.strip())


@dataclass
class Block:
    index: int
    clip: Path
    audio: Path | None
    text: str


def build_segment(
    block: Block, window: float, width: int, height: int, workdir: Path
) -> tuple[Path, float, float]:
    """Render one normalized block segment. Returns (path, speech_start, speech_dur)."""
    out = workdir / f"segment-{block.index:02d}.mp4"

    # Scale to cover the frame, center-crop, hold the last frame if the clip is
    # short, hard-cut at the window if it is long. The clip is never stretched,
    # and this also rescues clips that came back in the wrong aspect ratio.
    video_filter = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},setsar=1,fps={FPS},"
        f"tpad=stop_mode=clone:stop_duration={window},"
        f"trim=duration={window},setpts=PTS-STARTPTS"
    )

    cmd = ["ffmpeg", "-y", "-i", str(block.clip)]
    speech_start, speech_dur = 0.0, 0.0

    if block.audio is not None:
        raw_dur = probe_duration(block.audio)
        speech_start, tempo = audio_placement(raw_dur, window)
        speech_dur = min(raw_dur / tempo, window - speech_start)
        cmd += ["-i", str(block.audio)]
        audio_chain = "[1:a]"
        if tempo != 1.0:
            audio_chain += f"atempo={tempo},"
        else:
            audio_chain += "anull,"
        audio_chain += (
            f"adelay={int(speech_start * 1000)}|{int(speech_start * 1000)},"
            f"apad,atrim=duration={window},asetpts=PTS-STARTPTS[a]"
        )
        filter_complex = f"[0:v]{video_filter}[v];{audio_chain}"
        maps = ["-map", "[v]", "-map", "[a]"]
    else:
        filter_complex = f"[0:v]{video_filter}[v]"
        cmd += ["-f", "lavfi", "-t", str(window), "-i", "anullsrc=r=48000:cl=stereo"]
        maps = ["-map", "[v]", "-map", "1:a"]

    cmd += [
        "-filter_complex", filter_complex, *maps,
        "-t", str(window),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart",
        str(out),
    ]
    run(cmd)
    return out, speech_start, speech_dur


def concat_segments(segments: list[Path], workdir: Path) -> Path:
    listing = workdir / "segments.txt"
    listing.write_text(
        "".join(f"file '{path.as_posix()}'\n" for path in segments), encoding="utf-8"
    )
    body = workdir / "body.mp4"
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
        "-c", "copy", "-movflags", "+faststart", str(body),
    ])
    return body


def finish(
    body: Path,
    out: Path,
    music: Path | None,
    music_volume: float,
    srt: Path | None,
    font: str | None,
    total: float,
) -> None:
    """Mix the music bed and burn subtitles in a single final pass."""
    if music is None and srt is None:
        shutil.move(str(body), str(out))
        return

    cmd = ["ffmpeg", "-y", "-i", str(body)]
    filters: list[str] = []

    if music is not None:
        cmd += ["-stream_loop", "-1", "-i", str(music)]
        filters.append(
            f"[1:a]volume={music_volume},atrim=duration={total},"
            f"afade=t=out:st={max(total - 2, 0)}:d=2[bed];"
            f"[0:a][bed]amix=inputs=2:duration=first:dropout_transition=0,"
            f"alimiter=limit=0.95[a]"
        )
        audio_map = ["-map", "[a]"]
    else:
        audio_map = ["-map", "0:a"]

    if srt is not None:
        style = (
            "Bold=1,Fontsize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
            "BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=90"
        )
        if font:
            style = f"FontName={font}," + style
        # ffmpeg runs with cwd=srt.parent, so the filter takes a bare filename
        # and needs no path escaping at all.
        filters.append(f"[0:v]subtitles={srt.name}:force_style='{style}'[v]")
        video_map = ["-map", "[v]"]
    else:
        video_map = ["-map", "0:v"]

    cmd += [
        "-filter_complex", ";".join(filters), *video_map, *audio_map,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        str(out),
    ]
    run(cmd, cwd=srt.parent if srt is not None else None)


# --------------------------------------------------------------------------


def load_blocks(manifest: dict, root: Path) -> list[Block]:
    raw = manifest.get("blocks") or []
    if not raw:
        raise AssembleError("manifest has no blocks")
    blocks: list[Block] = []
    for index, entry in enumerate(raw, start=1):
        clip = root / entry["clip"]
        if not clip.exists():
            raise AssembleError(f"block {index}: clip not found at {clip}")
        audio = None
        if entry.get("audio"):
            audio = root / entry["audio"]
            if not audio.exists():
                raise AssembleError(f"block {index}: audio not found at {audio}")
        blocks.append(Block(index, clip, audio, entry.get("text", "").strip()))
    return blocks


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("manifest", type=Path, help="path to manifest.json")
    parser.add_argument("--out", default=None,
                        help="output filename, relative to the manifest folder "
                             "(default: final.mp4)")
    parser.add_argument("--keep-temp", action="store_true",
                        help="keep the per-block segments for debugging")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate the manifest and print the plan, encode nothing")
    args = parser.parse_args(argv)

    manifest_path = args.manifest.expanduser().resolve()
    if not manifest_path.exists():
        print(f"manifest not found: {manifest_path}", file=sys.stderr)
        return 1
    root = manifest_path.parent
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    try:
        width, height = resolve_size(manifest)
        window = float(manifest.get("block_seconds", DEFAULT_BLOCK_SECONDS))
        blocks = load_blocks(manifest, root)
    except (AssembleError, KeyError) as exc:
        print(f"manifest error: {exc}", file=sys.stderr)
        return 1

    total = window * len(blocks)
    out = root / (args.out or "final.mp4")

    print(f"{len(blocks)} blocks x {window:g}s = {total:g}s at {width}x{height}")
    if args.dry_run:
        for block in blocks:
            has_audio = "voiced" if block.audio else "SILENT"
            print(f"  block {block.index:02d}  {block.clip.name}  {has_audio}")
        print(f"would write {out}")
        return 0

    try:
        require_binaries()
    except AssembleError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    workdir = Path(tempfile.mkdtemp(prefix="vox-assemble-"))
    try:
        segments: list[Path] = []
        cues: list[tuple[float, float, str]] = []
        for block in blocks:
            window_start = (block.index - 1) * window
            segment, speech_start, speech_dur = build_segment(
                block, window, width, height, workdir
            )
            segments.append(segment)
            if manifest.get("subtitles") and block.text:
                cues.extend(
                    caption_cues(block.text, window_start, speech_start, speech_dur)
                )
            print(f"  block {block.index:02d} rendered")

        body = concat_segments(segments, workdir)

        # The sidecar SRT is always written when captions were requested: it is
        # uploadable to YouTube as-is and survives even if burning is impossible.
        srt = None
        if cues:
            sidecar = out.with_suffix(".srt")
            sidecar.write_text(build_srt(cues), encoding="utf-8")
            print(f"  captions written to {sidecar.name}")
            if has_filter("subtitles"):
                srt = workdir / "captions.srt"
                srt.write_text(build_srt(cues), encoding="utf-8")
            else:
                print(
                    "  NOTE: this ffmpeg was built without libass, so the "
                    "`subtitles` filter is missing and captions could not be "
                    "burned in.\n"
                    "        The sidecar .srt above still uploads to YouTube. "
                    "To enable burning:\n"
                    "        brew install libass && brew reinstall "
                    "--build-from-source ffmpeg"
                )

        music = None
        if manifest.get("music"):
            candidate = root / manifest["music"]
            if candidate.exists():
                music = candidate
            else:
                print(f"  music not found at {candidate}, continuing without it")

        finish(
            body,
            out,
            music,
            float(manifest.get("music_volume", 0.18)),
            srt,
            manifest.get("subtitle_font"),
            total,
        )
    except AssembleError as exc:
        print(f"assembly failed: {exc}", file=sys.stderr)
        return 1
    finally:
        if args.keep_temp:
            print(f"temp files kept in {workdir}")
        else:
            shutil.rmtree(workdir, ignore_errors=True)

    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
