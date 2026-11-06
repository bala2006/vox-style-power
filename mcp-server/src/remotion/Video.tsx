import React, { useCallback, useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, useVideoConfig } from "remotion";
import type { RenderInput, Scene } from "../shared/schema";
import { Captions } from "./Captions";
import { BlockCamera, Stage } from "./newsroom/primitives";
import { EndCardView, HeadlineView, ListView, QuoteView } from "./newsroom/scenes-text";
import { BarChartView, ComparisonView, ImageView, LineChartView, StatView, TimelineView } from "./newsroom/scenes-data";

export const SceneView: React.FC<{ scene: Scene; assetBaseUrl: string }> = ({ scene, assetBaseUrl }) => {
  switch (scene.type) {
    case "headline":
      return <HeadlineView scene={scene} />;
    case "stat":
      return <StatView scene={scene} />;
    case "bar_chart":
      return <BarChartView scene={scene} />;
    case "line_chart":
      return <LineChartView scene={scene} />;
    case "comparison":
      return <ComparisonView scene={scene} />;
    case "list":
      return <ListView scene={scene} />;
    case "quote":
      return <QuoteView scene={scene} />;
    case "timeline":
      return <TimelineView scene={scene} />;
    case "image":
      return <ImageView scene={scene} assetBaseUrl={assetBaseUrl} />;
    case "end_card":
      return <EndCardView scene={scene} />;
  }
};

/** Music bed that ducks under the narrator, using the word timings. */
const MusicBed: React.FC<{ input: RenderInput }> = ({ input }) => {
  const { fps } = useVideoConfig();
  const music = input.project.music!;
  const speech = useMemo(
    () =>
      input.timeline
        .filter((b) => b.audioUrl && b.words.length)
        .map((b) => {
          const off = (b.startFrame + b.audioOffsetFrames) / fps;
          return [off + b.words[0].start, off + b.words[b.words.length - 1].end] as const;
        }),
    [input.timeline, fps],
  );
  const total = input.totalFrames / fps;
  const volume = useCallback(
    (f: number) => {
      const t = f / fps;
      // Distance in seconds to the nearest speech span (0 inside one).
      let dist = Infinity;
      for (const [s, e] of speech) {
        const d = t < s ? s - t : t > e ? t - e : 0;
        if (d < dist) dist = d;
      }
      const duck = interpolate(dist, [0, 0.35], [music.duck_to, music.volume], { extrapolateRight: "clamp" });
      const fadeIn = interpolate(t, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });
      const fadeOut = interpolate(t, [total - 1.5, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return duck * fadeIn * fadeOut;
    },
    [speech, music.duck_to, music.volume, fps, total],
  );
  return <Audio src={`${input.assetBaseUrl}assets/${encodeURIComponent(music.asset)}`} volume={volume} loop />;
};

export const Video: React.FC<RenderInput> = (input) => {
  const { project, timeline, assetBaseUrl } = input;
  return (
    <AbsoluteFill>
      <Stage />
      {timeline.map((t) => (
        <Sequence key={t.index} from={t.startFrame} durationInFrames={t.durationFrames} name={`Block ${t.index + 1}`}>
          <BlockCamera durationInFrames={t.durationFrames} index={t.index}>
            <SceneView scene={project.blocks[t.index].scene} assetBaseUrl={assetBaseUrl} />
          </BlockCamera>
          {t.audioUrl ? (
            <Sequence from={t.audioOffsetFrames} name={`Voice ${t.index + 1}`}>
              <Audio src={t.audioUrl} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
      {project.captions ? <Captions timeline={timeline} /> : null}
      {project.music && assetBaseUrl ? <MusicBed input={input} /> : null}
    </AbsoluteFill>
  );
};
