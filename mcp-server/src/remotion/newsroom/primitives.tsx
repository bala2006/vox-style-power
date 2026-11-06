import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { tornClipPath } from "../motion";

/**
 * THE STAGE: the persistent world every block lives on. Archival map paper,
 * faint graticule, print grain and a vignette. It never cuts between blocks.
 */
export const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // Grain re-seeds every 4 frames: enough to feel like film, cheap enough to encode.
  const grainSeed = Math.floor(frame / 4) % 4;
  const lines: React.ReactNode[] = [];
  const step = Math.min(width, height) / 7;
  for (let x = -step; x < width + step; x += step) {
    lines.push(
      <path
        key={`v${x}`}
        d={`M ${x} 0 Q ${x + step * 0.35} ${height / 2} ${x} ${height}`}
        stroke={C.ink}
        strokeOpacity={0.07}
        strokeWidth={2}
        fill="none"
      />,
    );
  }
  for (let y = step / 2; y < height; y += step) {
    lines.push(<line key={`h${y}`} x1={0} x2={width} y1={y} y2={y} stroke={C.ink} strokeOpacity={0.06} strokeWidth={2} />);
  }
  return (
    <AbsoluteFill style={{ backgroundColor: C.tan }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 30% 25%, ${C.tanLight} 0%, ${C.tan} 55%, ${C.tanDark} 100%)`,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {lines}
      </svg>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.38 }}>
        <filter id={`grain-${grainSeed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={grainSeed + 1} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${grainSeed})`} />
      </svg>
      <AbsoluteFill style={{ boxShadow: `inset 0 0 ${Math.min(width, height) * 0.22}px rgba(40,28,10,0.45)` }} />
    </AbsoluteFill>
  );
};

/** Halftone dot texture overlay. */
export const Halftone: React.FC<{ size: number; color?: string; opacity?: number }> = ({ size, color = C.ink, opacity = 0.25 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(${color} 30%, transparent 32%)`,
      backgroundSize: `${size}px ${size}px`,
      opacity,
      mixBlendMode: "multiply",
      pointerEvents: "none",
    }}
  />
);

/** Paper card with torn edges and an offset accent shape behind it. */
export const TornCard: React.FC<{
  seed: string;
  color?: string;
  offsetColor?: string;
  offset?: number;
  padding: number | string;
  style?: React.CSSProperties;
  halftone?: number;
  children: React.ReactNode;
}> = ({ seed, color = C.paper, offsetColor, offset = 0, padding, style, halftone, children }) => {
  const clip = tornClipPath(seed);
  return (
    <div style={{ position: "relative", ...style }}>
      {offsetColor ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate(${offset}px, ${offset}px)`,
            background: offsetColor,
            clipPath: tornClipPath(`${seed}-o`),
          }}
        />
      ) : null}
      <div
        style={{
          position: "relative",
          background: color,
          clipPath: clip,
          padding,
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
        }}
      >
        {halftone ? <Halftone size={halftone} opacity={0.12} /> : null}
        <div style={{ position: "relative" }}>{children}</div>
      </div>
    </div>
  );
};

/** Mustard tag label, typewriter face. */
export const Tag: React.FC<{ children: React.ReactNode; size: number; color?: string; textColor?: string; style?: React.CSSProperties }> = ({
  children,
  size,
  color = C.mustard,
  textColor = C.ink,
  style,
}) => (
  <div
    style={{
      display: "inline-block",
      background: color,
      color: textColor,
      fontFamily: F.label,
      fontSize: size,
      letterSpacing: size * 0.06,
      padding: `${size * 0.28}px ${size * 0.6}px`,
      textTransform: "uppercase",
      boxShadow: `${size * 0.15}px ${size * 0.15}px 0 ${C.ink}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Small "Fig." source annotation. */
export const FigNote: React.FC<{ children: React.ReactNode; size: number; style?: React.CSSProperties }> = ({ children, size, style }) => (
  <div style={{ fontFamily: F.label, fontSize: size, color: C.ink, opacity: 0.75, ...style }}>{children}</div>
);

/** Red underline swipe under inline content; `progress` 0→1. */
export const Swipe: React.FC<{ progress: number; thickness: number; children: React.ReactNode; color?: string }> = ({
  progress,
  thickness,
  children,
  color = C.red,
}) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    <span
      style={{
        position: "absolute",
        left: "-2%",
        right: "-2%",
        bottom: "6%",
        height: thickness,
        background: color,
        transformOrigin: "left center",
        transform: `scaleX(${progress}) skewX(-8deg)`,
        zIndex: 0,
      }}
    />
    <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
  </span>
);

/**
 * The per-block camera: a whip-in with motion blur, a slow 3% push across the
 * hold, and a whip-out on the last frames, so hard cuts read as one move.
 */
export const BlockCamera: React.FC<{ durationInFrames: number; index: number; shake?: number; children: React.ReactNode }> = ({
  durationInFrames,
  index,
  shake = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const dir = index % 2 === 0 ? 1 : -1;
  const inP = interpolate(frame, [0, 9], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outP = interpolate(frame, [durationInFrames - 6, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = inP * inP;
  const tx = dir * (eased * width * 0.35 - outP * outP * width * 0.3) + shake;
  const blur = eased * 18 + outP * 14;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03]);
  const opacity = 1 - outP * 0.6;
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${tx}px) scale(${push})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
