import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionWord, TimelineBlock } from "../shared/schema";
import { C, F, useLayout } from "./theme";

type Chunk = { words: (CaptionWord & { absStart: number; absEnd: number })[]; start: number; end: number };

const MAX_WORDS = 4;
const MAX_CHARS = 20;

/** Group words into short on-screen phrases, breaking after punctuation. */
export function buildChunks(timeline: TimelineBlock[], fps: number): Chunk[] {
  const chunks: Chunk[] = [];
  for (const b of timeline) {
    const offset = (b.startFrame + b.audioOffsetFrames) / fps;
    const blockEnd = (b.startFrame + b.durationFrames) / fps;
    let cur: Chunk["words"] = [];
    const flush = () => {
      if (!cur.length) return;
      chunks.push({ words: cur, start: cur[0].absStart, end: cur[cur.length - 1].absEnd });
      cur = [];
    };
    for (const w of b.words) {
      const absStart = offset + w.start;
      const absEnd = Math.min(offset + w.end, blockEnd);
      const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
      if (cur.length >= MAX_WORDS || (cur.length && chars > MAX_CHARS)) flush();
      cur.push({ ...w, absStart, absEnd });
      if (/[.,;:!?)]$/.test(w.text)) flush();
    }
    flush();
  }
  // Hold each phrase until the next one starts (capped), so captions don't flicker.
  for (let i = 0; i < chunks.length; i++) {
    const next = chunks[i + 1];
    const hold = chunks[i].end + 0.6;
    chunks[i].end = next ? Math.min(Math.max(chunks[i].end, next.start - 0.02), hold) : hold;
  }
  return chunks;
}

export const Captions: React.FC<{ timeline: TimelineBlock[] }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const chunks = useMemo(() => buildChunks(timeline, fps), [timeline, fps]);
  const t = frame / fps;
  const chunk = chunks.find((c) => t >= c.start && t < c.end);
  if (!chunk) return null;
  const size = (L.portrait ? 7.4 : 6) * L.u;
  const pop = interpolate(t - chunk.start, [0, 0.12], [0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: L.padX * 0.6,
          right: L.padX * 0.6,
          top: L.captionCenterY,
          transform: `translateY(-50%) scale(${pop})`,
          textAlign: "center",
          fontFamily: F.headline,
          fontSize: size,
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: size * 0.01,
        }}
      >
        {chunk.words.map((w, i) => {
          const active = t >= w.absStart && t < Math.max(w.absEnd, w.absStart + 0.08);
          const spoken = t >= w.absStart;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: `0 ${size * 0.07}px`,
                padding: `0 ${size * 0.08}px`,
                color: active ? C.ink : C.white,
                background: active ? C.mustard : "transparent",
                opacity: spoken ? 1 : 0.85,
                WebkitTextStroke: active ? undefined : `${size * 0.09}px ${C.ink}`,
                paintOrder: "stroke fill",
                textShadow: active ? undefined : `0 ${size * 0.06}px 0 ${C.ink}`,
                transform: active ? "scale(1.06) rotate(-1.5deg)" : undefined,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
