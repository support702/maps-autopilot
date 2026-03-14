import React from "react";
import { Composition } from "remotion";
import {
  VideoWithCaptions,
  type VideoWithCaptionsProps,
} from "./compositions/VideoWithCaptions";

const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 300; // 10 seconds

const SAMPLE_CAPTIONS = [
  { word: "This", start: 0, end: 10 },
  { word: "is", start: 11, end: 18 },
  { word: "a", start: 19, end: 24 },
  { word: "sample", start: 25, end: 40 },
  { word: "caption", start: 41, end: 60 },
];

const ASPECT_RATIOS = [
  { id: "vertical", width: 1080, height: 1920 },
  { id: "square", width: 1080, height: 1080 },
  { id: "landscape", width: 1920, height: 1080 },
] as const;

const defaultProps: VideoWithCaptionsProps = {
  src: "https://example.com/sample.mp4",
  captions: SAMPLE_CAPTIONS,
  durationInFrames: DEFAULT_DURATION,
  fps: DEFAULT_FPS,
  ctaText: "Follow for more!",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {ASPECT_RATIOS.map(({ id, width, height }) => (
        <Composition
          key={id}
          id={`VideoWithCaptions-${id}`}
          component={VideoWithCaptions}
          durationInFrames={DEFAULT_DURATION}
          fps={DEFAULT_FPS}
          width={width}
          height={height}
          defaultProps={{
            ...defaultProps,
            width,
            height,
          }}
        />
      ))}
    </>
  );
};
