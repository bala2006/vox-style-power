import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Springy entrance with a little overshoot. 0 before `delay`, settles near 1. */
export function useEntrance(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: config.damping ?? 12, stiffness: config.stiffness ?? 170, mass: config.mass ?? 0.7 },
  });
}

/** Linear-ish 0→1 progress with ease-out between two frames. */
export function useProgress(from: number, duration: number, easing = Easing.out(Easing.cubic)) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + Math.max(duration, 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/**
 * Stamp impact: oversize → 1 with a hard landing. Returns a scale factor and a
 * short decaying shake offset (px) the caller can apply to the stage.
 */
export function useStamp(at: number, strength = 1) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 15, stiffness: 320, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [1 + 0.9 * strength, 1]);
  const opacity = interpolate(frame - at, [0, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const since = frame - at - 4;
  const shake = since >= 0 && since < 8 ? (random(`shake-${at}-${frame}`) - 0.5) * 2 * (1 - since / 8) * 9 * strength : 0;
  return { scale, opacity, shake };
}

/** Count from `from` to `to` over `duration` frames with a strong ease-out. */
export function useCounter(from: number, to: number, start: number, duration: number) {
  const p = useProgress(start, duration, Easing.out(Easing.exp));
  return from + (to - from) * p;
}

export function formatNumber(n: number, decimals = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Deterministic jagged polygon for torn-paper edges, as a CSS clip-path. */
export function tornClipPath(seed: string, roughness = 1.2, teeth = 34) {
  const pts: string[] = [];
  const r = (k: string) => random(`${seed}-${k}`) * roughness;
  for (let i = 0; i <= teeth; i++) pts.push(`${(i / teeth) * 100}% ${r(`t${i}`)}%`);
  for (let i = 0; i <= teeth / 3; i++) pts.push(`${100 - r(`r${i}`) * 0.6}% ${(i / (teeth / 3)) * 100}%`);
  for (let i = teeth; i >= 0; i--) pts.push(`${(i / teeth) * 100}% ${100 - r(`b${i}`)}%`);
  for (let i = Math.floor(teeth / 3); i >= 0; i--) pts.push(`${r(`l${i}`) * 0.6}% ${(i / (teeth / 3)) * 100}%`);
  return `polygon(${pts.join(", ")})`;
}
