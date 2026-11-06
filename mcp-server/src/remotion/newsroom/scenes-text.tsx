import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "../../shared/schema";
import { C, F, useLayout } from "../theme";
import { useEntrance, useProgress, useStamp } from "../motion";
import { FigNote, Swipe, Tag, TornCard } from "./primitives";

type Of<T extends Scene["type"]> = Extract<Scene, { type: T }>;

const Frame: React.FC<{ children: React.ReactNode; align?: "center" | "start" }> = ({ children, align = "center" }) => {
  const L = useLayout();
  return (
    <AbsoluteFill
      style={{
        top: L.contentTop,
        height: L.contentHeight,
        left: L.padX,
        width: L.contentWidth,
        display: "flex",
        flexDirection: "column",
        justifyContent: align === "center" ? "center" : "flex-start",
        alignItems: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Size headline type so long lines still fit the frame. */
function headlineSize(text: string, L: ReturnType<typeof useLayout>) {
  const chars = text.length;
  const base = L.portrait ? 15 : L.landscape ? 13 : 13;
  const shrink = chars > 60 ? 0.62 : chars > 40 ? 0.75 : chars > 24 ? 0.88 : 1;
  return base * shrink * L.u;
}

export const HeadlineView: React.FC<{ scene: Of<"headline"> }> = ({ scene }) => {
  const L = useLayout();
  const words = scene.headline.split(/\s+/);
  const hl = scene.highlight?.toLowerCase().split(/\s+/) ?? [];
  // Locate the highlight phrase as a word range inside the headline.
  let hlStart = -1;
  if (hl.length) {
    const lower = words.map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}%$']/gu, ""));
    const target = hl.map((w) => w.replace(/[^\p{L}\p{N}%$']/gu, ""));
    for (let i = 0; i + target.length <= lower.length; i++) {
      if (target.every((t, k) => lower[i + k] === t)) {
        hlStart = i;
        break;
      }
    }
  }
  const size = headlineSize(scene.headline, L);
  const kick = useEntrance(4);
  const lastWordAt = 8 + words.length * 3;
  const swipe = useProgress(lastWordAt + 4, 10);
  const sub = useEntrance(lastWordAt + 10);
  return (
    <Frame>
      {scene.kicker ? (
        <div style={{ transform: `translateY(${(1 - kick) * 4 * L.u}px)`, opacity: kick, marginBottom: 4 * L.u }}>
          <Tag size={3.4 * L.u}>{scene.kicker}</Tag>
        </div>
      ) : null}
      <div
        style={{
          fontFamily: F.headline,
          fontSize: size,
          lineHeight: 1.02,
          color: C.ink,
          textTransform: "uppercase",
          textAlign: "center",
          letterSpacing: size * 0.005,
        }}
      >
        {words.map((w, i) => (
          <HeadlineWord key={i} delay={8 + i * 3} size={size}>
            {hlStart >= 0 && i >= hlStart && i < hlStart + hl.length ? (
              <Swipe progress={swipe} thickness={size * 0.22}>
                {w}
              </Swipe>
            ) : (
              w
            )}
          </HeadlineWord>
        ))}
      </div>
      {scene.subline ? (
        <div
          style={{
            marginTop: 5 * L.u,
            fontFamily: F.body,
            fontSize: 4.6 * L.u,
            color: C.ink,
            textAlign: "center",
            maxWidth: L.contentWidth * 0.9,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 3 * L.u}px)`,
          }}
        >
          {scene.subline}
        </div>
      ) : null}
    </Frame>
  );
};

const HeadlineWord: React.FC<{ delay: number; size: number; children: React.ReactNode }> = ({ delay, size, children }) => {
  const p = useEntrance(delay, { damping: 10, stiffness: 200 });
  return (
    <span
      style={{
        display: "inline-block",
        marginRight: size * 0.22,
        transform: `translateY(${(1 - p) * size * 0.6}px) rotate(${(1 - p) * -6}deg)`,
        opacity: Math.min(1, p * 1.4),
      }}
    >
      {children}
    </span>
  );
};

export const ListView: React.FC<{ scene: Of<"list"> }> = ({ scene }) => {
  const L = useLayout();
  const title = useEntrance(3);
  const itemSize = (scene.items.length > 3 ? 4.6 : 5.4) * L.u;
  return (
    <Frame>
      <div
        style={{
          fontFamily: F.headline,
          fontSize: 8 * L.u,
          textTransform: "uppercase",
          color: C.ink,
          textAlign: "center",
          opacity: title,
          transform: `scale(${0.9 + title * 0.1})`,
          marginBottom: 5 * L.u,
        }}
      >
        {scene.title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 * L.u, width: "100%" }}>
        {scene.items.map((item, i) => (
          <ListItem key={i} index={i} text={item} size={itemSize} at={14 + i * 14} />
        ))}
      </div>
    </Frame>
  );
};

const ListItem: React.FC<{ index: number; text: string; size: number; at: number }> = ({ index, text, size, at }) => {
  const L = useLayout();
  const stamp = useStamp(at, 0.5);
  const slide = useEntrance(at + 2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 * L.u }}>
      <div
        style={{
          flex: "none",
          width: size * 1.7,
          height: size * 1.7,
          borderRadius: "50%",
          background: C.red,
          color: C.white,
          fontFamily: F.headline,
          fontSize: size * 1.05,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${stamp.scale}) translateX(${stamp.shake}px)`,
          opacity: stamp.opacity,
          boxShadow: `${0.6 * L.u}px ${0.6 * L.u}px 0 ${C.ink}`,
        }}
      >
        {index + 1}
      </div>
      <TornCard
        seed={`list-${index}`}
        padding={`${size * 0.45}px ${size * 0.7}px`}
        style={{ flex: 1, opacity: slide, transform: `translateX(${(1 - slide) * 12 * L.u}px)` }}
      >
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: size, color: C.ink, lineHeight: 1.2 }}>{text}</div>
      </TornCard>
    </div>
  );
};

export const QuoteView: React.FC<{ scene: Of<"quote"> }> = ({ scene }) => {
  const L = useLayout();
  const card = useEntrance(4, { damping: 14 });
  const mark = useStamp(10, 0.6);
  const attr = useEntrance(24);
  const len = scene.quote.length;
  const size = (len > 160 ? 4.6 : len > 100 ? 5.4 : 6.4) * L.u;
  const words = scene.quote.split(/\s+/);
  const frame = useCurrentFrame();
  return (
    <Frame>
      <TornCard
        seed="quote"
        offsetColor={C.ink}
        offset={1.4 * L.u}
        padding={`${7 * L.u}px ${6 * L.u}px ${6 * L.u}px`}
        halftone={1.2 * L.u}
        style={{ width: "100%", transform: `rotate(${(1 - card) * -4 - 1}deg) scale(${0.85 + card * 0.15})`, opacity: card }}
      >
        <div
          style={{
            position: "absolute",
            top: -9 * L.u,
            left: -1 * L.u,
            fontFamily: F.headline,
            fontSize: 26 * L.u,
            color: C.red,
            transform: `scale(${mark.scale})`,
            opacity: mark.opacity,
            lineHeight: 1,
          }}
        >
          &ldquo;
        </div>
        <div style={{ fontFamily: F.body, fontSize: size, lineHeight: 1.3, color: C.ink, fontWeight: 600 }}>
          {words.map((w, i) => (
            <span
              key={i}
              style={{ opacity: interpolate(frame, [12 + i * 1.2, 16 + i * 1.2], [0.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}
            >
              {w}{" "}
            </span>
          ))}
        </div>
      </TornCard>
      <div style={{ marginTop: 5 * L.u, alignSelf: "flex-end", opacity: attr, transform: `translateX(${(1 - attr) * 8 * L.u}px)` }}>
        <Tag size={3.6 * L.u}>{scene.attribution}</Tag>
        {scene.role ? <FigNote size={3 * L.u} style={{ marginTop: 1.5 * L.u, textAlign: "right" }}>{scene.role}</FigNote> : null}
      </div>
    </Frame>
  );
};

export const EndCardView: React.FC<{ scene: Of<"end_card"> }> = ({ scene }) => {
  const L = useLayout();
  const head = useStamp(6, 0.35);
  const cta = useEntrance(22);
  const src = useEntrance(30);
  const size = headlineSize(scene.headline, L) * 0.85;
  return (
    <Frame>
      <div
        style={{
          fontFamily: F.headline,
          fontSize: size,
          lineHeight: 1.04,
          textTransform: "uppercase",
          textAlign: "center",
          color: C.ink,
          transform: `scale(${head.scale}) translateX(${head.shake}px)`,
          opacity: head.opacity,
        }}
      >
        {scene.headline}
      </div>
      {scene.cta ? (
        <div style={{ marginTop: 6 * L.u, transform: `scale(${0.6 + cta * 0.4})`, opacity: cta }}>
          <Tag size={4.4 * L.u} color={C.red} textColor={C.white}>
            {scene.cta}
          </Tag>
        </div>
      ) : null}
      {scene.sources?.length ? (
        <div style={{ marginTop: 7 * L.u, opacity: src * 0.85, textAlign: "center" }}>
          <FigNote size={2.6 * L.u}>Sources: {scene.sources.join(" · ")}</FigNote>
        </div>
      ) : null}
    </Frame>
  );
};

export { Frame, headlineSize };
