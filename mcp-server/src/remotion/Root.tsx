import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import type { RenderInput } from "../shared/schema";
import { Video } from "./Video";
import { sampleInput } from "./sample";

const calculateMetadata: CalculateMetadataFunction<RenderInput> = ({ props }) => ({
  durationInFrames: Math.max(1, props.totalFrames),
  fps: props.project.fps,
  width: props.width,
  height: props.height,
});

export const Root: React.FC = () => (
  <Composition
    id="Vox"
    component={Video as unknown as React.FC<Record<string, unknown>>}
    defaultProps={sampleInput as unknown as Record<string, unknown>}
    calculateMetadata={calculateMetadata as unknown as CalculateMetadataFunction<Record<string, unknown>>}
    durationInFrames={sampleInput.totalFrames}
    fps={30}
    width={sampleInput.width}
    height={sampleInput.height}
  />
);
