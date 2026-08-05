"""Unit tests for the pure timing/caption helpers in assemble.py.

Run from the project root:
    python3 -m pytest skills/vox/scripts/test_assemble.py
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from assemble import (  # noqa: E402
    AssembleError,
    audio_placement,
    build_srt,
    caption_cues,
    chunk_caption,
    resolve_size,
    srt_timestamp,
)


class TestAudioPlacement:
    def test_short_take_is_centered(self):
        start, tempo = audio_placement(7.0, 10.0)
        assert start == 1.5
        assert tempo == 1.0

    def test_exact_fit_starts_at_zero(self):
        assert audio_placement(10.0, 10.0) == (0.0, 1.0)

    def test_slight_overrun_is_compressed_not_delayed(self):
        start, tempo = audio_placement(11.0, 10.0)
        assert start == 0.0
        assert tempo == pytest.approx(1.1)

    def test_big_overrun_fails_loudly(self):
        with pytest.raises(AssembleError, match="Shorten the line"):
            audio_placement(15.0, 10.0)

    def test_missing_audio_is_a_no_op(self):
        assert audio_placement(0.0, 10.0) == (0.0, 1.0)


class TestChunkCaption:
    def test_short_line_stays_one_chunk(self):
        assert chunk_caption("Ten companies now make up the index.") == [
            "Ten companies now make up the index."
        ]

    def test_long_line_splits_on_word_boundaries(self):
        text = (
            "Ten companies now make up forty one percent of the entire "
            "S and P five hundred, more concentrated than the dot com peak."
        )
        chunks = chunk_caption(text, max_chars=42)
        assert len(chunks) > 1
        assert all(len(chunk) <= 42 for chunk in chunks)
        assert " ".join(chunks) == text

    def test_a_single_overlong_word_is_never_dropped(self):
        chunks = chunk_caption("supercalifragilisticexpialidocious" * 2, max_chars=10)
        assert "".join(chunks) == "supercalifragilisticexpialidocious" * 2

    def test_empty_text_yields_nothing(self):
        assert chunk_caption("   ") == []


class TestSrt:
    def test_timestamp_format(self):
        assert srt_timestamp(0) == "00:00:00,000"
        assert srt_timestamp(65.25) == "00:01:05,250"
        assert srt_timestamp(3661.5) == "01:01:01,500"

    def test_negative_time_clamps_to_zero(self):
        assert srt_timestamp(-3) == "00:00:00,000"

    def test_build_srt_numbers_cues_from_one(self):
        out = build_srt([(0.0, 1.5, "first"), (1.5, 3.0, "second")])
        assert out.startswith("1\n00:00:00,000 --> 00:00:01,500\nfirst\n")
        assert "2\n00:00:01,500 --> 00:00:03,000\nsecond\n" in out


class TestCaptionCues:
    def test_cues_span_only_the_speech_window(self):
        cues = caption_cues("one two three four", window_start=10.0,
                            speech_start=1.5, speech_dur=7.0)
        assert cues[0][0] == pytest.approx(11.5)
        assert cues[-1][1] == pytest.approx(18.5)

    def test_cues_are_contiguous_and_ordered(self):
        text = " ".join(["word"] * 40)
        cues = caption_cues(text, 0.0, 0.0, 10.0)
        assert len(cues) > 1
        for earlier, later in zip(cues, cues[1:]):
            assert earlier[1] == pytest.approx(later[0])

    def test_silent_block_gets_no_captions(self):
        assert caption_cues("some words", 0.0, 0.0, 0.0) == []


class TestResolveSize:
    def test_default_is_vertical(self):
        assert resolve_size({}) == (720, 1280)

    def test_landscape(self):
        assert resolve_size({"aspect": "16:9"}) == (1280, 720)

    def test_explicit_size_wins(self):
        assert resolve_size({"aspect": "9:16", "width": 1080, "height": 1920}) == (
            1080,
            1920,
        )

    def test_unknown_aspect_is_rejected(self):
        with pytest.raises(AssembleError, match="unknown aspect"):
            resolve_size({"aspect": "4:3"})
