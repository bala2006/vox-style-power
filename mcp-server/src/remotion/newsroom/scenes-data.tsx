import React from "react";
import { Img, interpolate } from "remotion";
import type { Scene } from "../../shared/schema";
import { accentColor, C, F, useLayout } from "../theme";
import { formatNumber, useCounter, useEntrance, useProgress, useStamp } from "../motion";
import { FigNote, Halftone, Tag, TornCard } from "./primitives";
import { Frame } from "./scenes-text";

type Of<T extends Scene["type"]> = Extract<Scene, { type: T }>;

const decimalsOf = (n: number) => {
  const s = String(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : Math.min(s.length - i - 1, 2);
};

export const StatView: React.FC<{ scene: Of<"stat"> }> = ({ scene }) => {
  const L = useLayout();
  const decimals = scene.decimals ?? decimalsOf(scene.value);
  const n = useCounter(scene.from ?? 0, scene.value, 6, 34);
  const stamp = useStamp(40, 0.25);
  const card = useEntrance(2, { damping: 13 });
  const label = useEntrance(16);
  const ctx = useEntrance(46);
  const text = `${scene.prefix ?? ""}${formatNumber(n, decimals)}${scene.suffix ?? ""}`;
  const finalText = `${scene.prefix ?? ""}${formatNumber(scene.value, decimals)}${scene.suffix ?? ""}`;
  // Anton digits are ~0.5em wide; size the number so the card stays inside the frame.
  const inner = L.contentWidth * (L.portrait ? 0.92 : 0.7) - 14 * L.u;
  const size = Math.min((L.portrait ? 30 : 26) * L.u, inner / (Math.max(finalText.length, 2) * 0.56));
  const accent = accentColor(scene.accent);
  return (
    <Frame>
      <TornCard
        seed="stat"
        color={accent}
        offsetColor={C.ink}
        offset={1.6 * L.u}
        padding={`${3 * L.u}px ${7 * L.u}px ${4 * L.u}px`}
        halftone={1.4 * L.u}
        style={{ transform: `scale(${(0.7 + card * 0.3) * stamp.scale}) rotate(-2deg) translateX(${stamp.shake}px)`, opacity: card }}
      >
        <div
          style={{
            fontFamily: F.headline,
            fontSize: size,
            lineHeight: 1,
            color: scene.accent === "mustard" ? C.ink : C.white,
            fontVariantNumeric: "tabular-nums",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </TornCard>
      <div
        style={{
          marginTop: 6 * L.u,
          fontFamily: F.headline,
          textTransform: "uppercase",
          fontSize: 7 * L.u,
          lineHeight: 1.05,
          color: C.ink,
          textAlign: "center",
          opacity: label,
          transform: `translateY(${(1 - label) * 4 * L.u}px)`,
        }}
      >
        {scene.label}
      </div>
      {scene.context ? (
        <div style={{ marginTop: 3 * L.u, fontFamily: F.body, fontSize: 4.2 * L.u, color: C.ink, textAlign: "center", opacity: ctx }}>
          {scene.context}
        </div>
      ) : null}
      {scene.source ? <FigNote size={2.6 * L.u} style={{ marginTop: 4 * L.u, opacity: ctx * 0.8 }}>Fig. Source: {scene.source}</FigNote> : null}
    </Frame>
  );
};

export const BarChartView: React.FC<{ scene: Of<"bar_chart"> }> = ({ scene }) => {
  const L = useLayout();
  const max = Math.max(...scene.bars.map((b) => Math.abs(b.value)), 1e-9);
  const title = useEntrance(2);
  const rows = scene.bars.length;
  const rowH = Math.min(11 * L.u, (L.contentHeight * 0.68) / rows);
  const labelW = L.contentWidth * (L.portrait ? 0.3 : 0.24);
  const barMax = L.contentWidth - labelW - 18 * L.u;
  return (
    <Frame>
      <ChartTitle text={scene.title} p={title} />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: rowH * 0.28 }}>
        {scene.bars.map((b, i) => (
          <Bar
            key={i}
            label={b.label}
            value={b.value}
            width={(Math.abs(b.value) / max) * barMax}
            labelW={labelW}
            h={rowH * 0.72}
            at={10 + i * 7}
            color={b.highlight ? C.red : C.ink}
            prefix={scene.prefix}
            unit={scene.unit}
          />
        ))}
      </div>
      {scene.source ? <FigNote size={2.6 * L.u} style={{ marginTop: 4 * L.u, alignSelf: "flex-start" }}>Fig. Source: {scene.source}</FigNote> : null}
    </Frame>
  );
};

const ChartTitle: React.FC<{ text: string; p: number }> = ({ text, p }) => {
  const L = useLayout();
  return (
    <div
      style={{
        alignSelf: "flex-start",
        fontFamily: F.headline,
        textTransform: "uppercase",
        fontSize: 7 * L.u,
        lineHeight: 1.05,
        color: C.ink,
        marginBottom: 5 * L.u,
        opacity: p,
        transform: `translateX(${(1 - p) * -6 * L.u}px)`,
        borderLeft: `${1.4 * L.u}px solid ${C.red}`,
        paddingLeft: 2.4 * L.u,
      }}
    >
      {text}
    </div>
  );
};

const Bar: React.FC<{
  label: string;
  value: number;
  width: number;
  labelW: number;
  h: number;
  at: number;
  color: string;
  prefix?: string;
  unit?: string;
}> = ({ label, value, width, labelW, h, at, color, prefix, unit }) => {
  const L = useLayout();
  const grow = useEntrance(at, { damping: 14, stiffness: 120 });
  const n = useCounter(0, value, at, 22);
  const d = decimalsOf(value);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: labelW,
          paddingRight: 2.4 * L.u,
          textAlign: "right",
          fontFamily: F.body,
          fontWeight: 700,
          fontSize: Math.min(h * 0.42, 4.2 * L.u),
          color: C.ink,
          lineHeight: 1.05,
        }}
      >
        {label}
      </div>
      <div style={{ position: "relative", height: h, width: Math.max(width * grow, 2), background: color, boxShadow: `${0.6 * L.u}px ${0.6 * L.u}px 0 rgba(0,0,0,0.35)` }}>
        <Halftone size={1.1 * L.u} color={C.white} opacity={0.18} />
      </div>
      <div style={{ marginLeft: 2 * L.u, fontFamily: F.headline, fontSize: h * 0.62, color: C.ink, opacity: grow, whiteSpace: "nowrap" }}>
        {prefix ?? ""}
        {formatNumber(n, d)}
        {unit ?? ""}
      </div>
    </div>
  );
};

export const LineChartView: React.FC<{ scene: Of<"line_chart"> }> = ({ scene }) => {
  const L = useLayout();
  const title = useEntrance(2);
  const draw = useProgress(10, 40);
  const W = L.contentWidth;
  const H = L.contentHeight * (L.portrait ? 0.5 : 0.5);
  const pad = { l: 2 * L.u, r: 6 * L.u, t: 4 * L.u, b: 7 * L.u };
  const vals = scene.points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const lo = min - span * 0.1;
  const hi = max + span * 0.12;
  const pts = scene.points.map((p, i) => ({
    x: pad.l + (i / (scene.points.length - 1)) * (W - pad.l - pad.r),
    y: pad.t + (1 - (p.value - lo) / (hi - lo)) * (H - pad.t - pad.b),
  }));
  const d = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const last = pts[pts.length - 1];
  const end = useStamp(52, 0.4);
  const note = useEntrance(56);
  const lastPoint = scene.points[scene.points.length - 1];
  const dec = decimalsOf(lastPoint.value);
  const fontS = 3 * L.u;
  return (
    <Frame>
      <ChartTitle text={scene.title} p={title} />
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + g * (H - pad.t - pad.b)}
            y2={pad.t + g * (H - pad.t - pad.b)}
            stroke={C.ink}
            strokeOpacity={0.18}
            strokeDasharray={`${L.u} ${L.u}`}
            strokeWidth={2}
          />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke={C.ink} strokeWidth={3} />
        <path d={d} stroke={C.ink} strokeOpacity={0.25} strokeWidth={1.6 * L.u} fill="none" transform={`translate(${0.6 * L.u}, ${0.6 * L.u})`} strokeDasharray={length} strokeDashoffset={length * (1 - draw)} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} stroke={C.red} strokeWidth={1.4 * L.u} fill="none" strokeDasharray={length} strokeDashoffset={length * (1 - draw)} strokeLinejoin="round" strokeLinecap="round" />
        <text x={pts[0].x} y={H - pad.b + 5 * L.u} fontFamily={F.label} fontSize={fontS} fill={C.ink}>
          {scene.points[0].label}
        </text>
        <text x={last.x} y={H - pad.b + 5 * L.u} fontFamily={F.label} fontSize={fontS} fill={C.ink} textAnchor="end">
          {lastPoint.label}
        </text>
        <circle cx={last.x} cy={last.y} r={2.4 * L.u * end.scale} fill={C.red} stroke={C.ink} strokeWidth={0.5 * L.u} opacity={end.opacity} />
      </svg>
      <div style={{ alignSelf: "flex-end", marginTop: 2 * L.u, opacity: note, transform: `translateY(${(1 - note) * 3 * L.u}px)`, textAlign: "right" }}>
        <div style={{ fontFamily: F.headline, fontSize: 9 * L.u, color: C.red, lineHeight: 1 }}>
          {scene.prefix ?? ""}
          {formatNumber(lastPoint.value, dec)}
          {scene.unit ?? ""}
        </div>
        {scene.annotation ? <Tag size={3.2 * L.u} style={{ marginTop: 1.5 * L.u }}>{scene.annotation}</Tag> : null}
      </div>
      {scene.source ? <FigNote size={2.6 * L.u} style={{ marginTop: 3 * L.u, alignSelf: "flex-start" }}>Fig. Source: {scene.source}</FigNote> : null}
    </Frame>
  );
};

export const ComparisonView: React.FC<{ scene: Of<"comparison"> }> = ({ scene }) => {
  const L = useLayout();
  const left = useEntrance(6, { damping: 13, stiffness: 190 });
  const right = useEntrance(16, { damping: 13, stiffness: 190 });
  const vs = useStamp(26, 0.6);
  const verdict = useStamp(44, 0.3);
  const title = useEntrance(2);
  const stacked = L.portrait;
  const cardW = stacked ? L.contentWidth * 0.86 : L.contentWidth * 0.42;
  const card = (side: "left" | "right", p: number) => {
    const s = scene[side];
    const win = scene.winner === side;
    const from = side === "left" ? -1 : 1;
    return (
      <TornCard
        seed={`cmp-${side}`}
        color={win ? C.red : C.paper}
        offsetColor={C.ink}
        offset={1.2 * L.u}
        padding={`${4 * L.u}px ${5 * L.u}px`}
        halftone={win ? 1.3 * L.u : undefined}
        style={{
          width: cardW,
          transform: stacked
            ? `translateX(${(1 - p) * from * 110}%) rotate(${from * 1.5}deg)`
            : `translateX(${(1 - p) * from * 120}%) rotate(${from * 2}deg)`,
          opacity: interpolate(p, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ fontFamily: F.label, fontSize: 3.6 * L.u, color: win ? C.white : C.ink, textTransform: "uppercase" }}>{s.label}</div>
        <div style={{ fontFamily: F.headline, fontSize: (stacked ? 16 : 13) * L.u, lineHeight: 1.05, color: win ? C.white : C.ink }}>{s.value}</div>
        {s.note ? <div style={{ fontFamily: F.body, fontSize: 3.8 * L.u, color: win ? C.white : C.ink }}>{s.note}</div> : null}
      </TornCard>
    );
  };
  return (
    <Frame>
      {scene.title ? <ChartTitle text={scene.title} p={title} /> : null}
      <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", alignItems: "center", gap: 3 * L.u, justifyContent: "center", width: "100%" }}>
        {card("left", left)}
        <div
          style={{
            fontFamily: F.headline,
            fontSize: 9 * L.u,
            color: C.mustard,
            WebkitTextStroke: `${0.35 * L.u}px ${C.ink}`,
            transform: `scale(${vs.scale}) rotate(-8deg) translateX(${vs.shake}px)`,
            opacity: vs.opacity,
            zIndex: 2,
          }}
        >
          VS
        </div>
        {card("right", right)}
      </div>
      {scene.verdict ? (
        <div style={{ marginTop: 5 * L.u, transform: `scale(${verdict.scale}) rotate(-2deg)`, opacity: verdict.opacity }}>
          <Tag size={4 * L.u}>{scene.verdict}</Tag>
        </div>
      ) : null}
    </Frame>
  );
};

export const TimelineView: React.FC<{ scene: Of<"timeline"> }> = ({ scene }) => {
  const L = useLayout();
  const title = useEntrance(2);
  const line = useProgress(6, 30);
  const vertical = L.portrait;
  const n = scene.events.length;
  return (
    <Frame>
      {scene.title ? <ChartTitle text={scene.title} p={title} /> : null}
      <div
        style={{
          position: "relative",
          width: vertical ? "100%" : L.contentWidth,
          height: vertical ? L.contentHeight * 0.72 : L.contentHeight * 0.5,
        }}
      >
        <div
          style={{
            position: "absolute",
            background: C.ink,
            ...(vertical
              ? { left: "18%", top: 0, width: 0.8 * L.u, height: `${line * 100}%` }
              : { top: "50%", left: 0, height: 0.8 * L.u, width: `${line * 100}%` }),
          }}
        />
        {scene.events.map((e, i) => {
          const t = n === 1 ? 0.5 : i / (n - 1);
          const pos = 0.06 + t * 0.88;
          return (
            <TimelineEvent
              key={i}
              date={e.date}
              label={e.label}
              at={10 + i * 9}
              pos={pos}
              vertical={vertical}
              hot={scene.highlight_index === i}
              above={i % 2 === 0}
            />
          );
        })}
      </div>
    </Frame>
  );
};

const TimelineEvent: React.FC<{ date: string; label: string; at: number; pos: number; vertical: boolean; hot: boolean; above: boolean }> = ({
  date,
  label,
  at,
  pos,
  vertical,
  hot,
  above,
}) => {
  const L = useLayout();
  const pop = useStamp(at, 0.5);
  const txt = useEntrance(at + 3);
  const dot = 4.2 * L.u;
  const text = (
    <div style={{ opacity: txt, width: vertical ? "auto" : 24 * L.u, textAlign: vertical ? "left" : "center" }}>
      <div style={{ fontFamily: F.headline, fontSize: 6 * L.u, color: hot ? C.red : C.ink, lineHeight: 1 }}>{date}</div>
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 3.6 * L.u, color: C.ink, lineHeight: 1.15 }}>{label}</div>
    </div>
  );
  const marker = (
    <div
      style={{
        width: dot,
        height: dot,
        borderRadius: "50%",
        background: hot ? C.red : C.mustard,
        border: `${0.6 * L.u}px solid ${C.ink}`,
        transform: `scale(${pop.scale})`,
        opacity: pop.opacity,
        flex: "none",
      }}
    />
  );
  if (vertical) {
    return (
      <div style={{ position: "absolute", top: `${pos * 100}%`, left: `calc(18% + ${0.4 * L.u - dot / 2}px)`, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 3 * L.u }}>
        {marker}
        {text}
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: `${pos * 100}%`,
        top: "50%",
        transform: `translate(-50%, ${above ? "-100%" : "0"}) translateY(${above ? dot / 2 : -dot / 2}px)`,
        display: "flex",
        flexDirection: above ? "column-reverse" : "column",
        alignItems: "center",
        gap: 2 * L.u,
      }}
    >
      {marker}
      {text}
    </div>
  );
};

export const ImageView: React.FC<{ scene: Of<"image">; assetBaseUrl: string }> = ({ scene, assetBaseUrl }) => {
  const L = useLayout();
  const enter = useEntrance(4, { damping: 13, stiffness: 140 });
  const cap = useEntrance(20);
  const halftone = (scene.treatment ?? "halftone") === "halftone";
  const src = `${assetBaseUrl}assets/${encodeURIComponent(scene.asset)}`;
  const maxW = L.contentWidth * (L.portrait ? 0.98 : 0.8);
  const maxH = L.contentHeight * 0.72;
  return (
    <Frame>
      <div style={{ position: "relative", transform: `scale(${0.8 + enter * 0.2}) rotate(${(1 - enter) * 5 - 1.5}deg)`, opacity: enter }}>
        <TornCard seed={`img-${scene.asset}`} color={C.white} offsetColor={halftone ? C.red : C.ink} offset={1.6 * L.u} padding={1.6 * L.u}>
          <div style={{ position: "relative", lineHeight: 0 }}>
            <Img
              src={src}
              style={{
                maxWidth: maxW,
                maxHeight: maxH,
                display: "block",
                objectFit: "contain",
                filter: halftone ? "grayscale(1) contrast(1.45) brightness(1.05)" : "sepia(0.35) contrast(1.05)",
              }}
            />
            {halftone ? <Halftone size={0.9 * L.u} opacity={0.42} /> : null}
            {(scene.pins ?? []).map((p, i) => (
              <Pin key={i} x={p.x} y={p.y} label={p.label} at={18 + i * 8} />
            ))}
          </div>
        </TornCard>
        {scene.label ? (
          <div style={{ position: "absolute", top: -2.5 * L.u, left: -2 * L.u, transform: "rotate(-4deg)" }}>
            <Tag size={3.4 * L.u}>{scene.label}</Tag>
          </div>
        ) : null}
      </div>
      {scene.caption ? (
        <div style={{ marginTop: 4 * L.u, fontFamily: F.body, fontSize: 4.2 * L.u, fontWeight: 600, color: C.ink, textAlign: "center", opacity: cap }}>
          {scene.caption}
        </div>
      ) : null}
    </Frame>
  );
};

const Pin: React.FC<{ x: number; y: number; label: string; at: number }> = ({ x, y, label, at }) => {
  const L = useLayout();
  const drop = useEntrance(at, { damping: 9, stiffness: 220 });
  const s = 5 * L.u;
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -100%) translateY(${(1 - drop) * -14 * L.u}px)`,
        opacity: Math.min(1, drop * 2),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      <Tag size={2.8 * L.u} style={{ marginBottom: 1 * L.u, whiteSpace: "nowrap" }}>
        {label}
      </Tag>
      <svg width={s} height={s * 1.35} viewBox="0 0 20 27">
        <path d="M10 0 C4.5 0 0 4.4 0 9.8 C0 17 10 27 10 27 C10 27 20 17 20 9.8 C20 4.4 15.5 0 10 0 Z" fill={C.red} stroke={C.ink} strokeWidth={1.6} />
        <circle cx={10} cy={9.6} r={3.6} fill={C.white} />
      </svg>
    </div>
  );
};
