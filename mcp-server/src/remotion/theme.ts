import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadSerif } from "@remotion/google-fonts/SourceSerif4";
import { loadFont as loadTypewriter } from "@remotion/google-fonts/SpecialElite";
import { useVideoConfig } from "remotion";

/** Newsroom collage palette, from assets/newsroom-style-sheet-prompt.txt. */
export const C = {
  tan: "#C9BB9C",
  tanLight: "#DCD0B4",
  tanDark: "#AE9F80",
  ink: "#1A1A1A",
  gray: "#8C8C8C",
  red: "#D62E1F",
  mustard: "#D9A441",
  paper: "#F3EDE0",
  white: "#FFFFFF",
} as const;

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] });
const serif = loadSerif("normal", { weights: ["400", "600", "700"], subsets: ["latin", "latin-ext"] });
const typewriter = loadTypewriter("normal", { weights: ["400"], subsets: ["latin"] });

export const F = {
  headline: anton.fontFamily,
  body: serif.fontFamily,
  label: typewriter.fontFamily,
};

export type Accent = "red" | "mustard" | "ink";
export const accentColor = (a: Accent | undefined) => (a === "mustard" ? C.mustard : a === "ink" ? C.ink : C.red);

/**
 * Layout in vmin-like units so every scene composes for 9:16, 16:9 and 1:1.
 * The caption band is reserved at the bottom; scenes stay above `contentBottom`.
 */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 100;
  const portrait = height > width * 1.2;
  const landscape = width > height * 1.2;
  const padX = portrait ? 7 * u : landscape ? 9 * u : 7 * u;
  const contentTop = height * (portrait ? 0.1 : 0.08);
  const contentBottom = height * (portrait ? 0.7 : 0.76);
  const captionCenterY = height * (portrait ? 0.8 : 0.87);
  return {
    width,
    height,
    u,
    portrait,
    landscape,
    padX,
    contentTop,
    contentBottom,
    contentHeight: contentBottom - contentTop,
    contentWidth: width - padX * 2,
    captionCenterY,
  };
}

export type Layout = ReturnType<typeof useLayout>;
