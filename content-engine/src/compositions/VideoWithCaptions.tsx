import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
} from "remotion";
import { CaptionOverlay } from "./CaptionOverlay";
import { BrandEndCard } from "./BrandEndCard";

interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

export interface VideoWithCaptionsProps extends Record<string, unknown> {
  src: string;
  captions: CaptionWord[];
  durationInFrames: number;
  fps?: number;
  width?: number;
  height?: number;
  logoSrc?: string;
  ctaText?: string;
}

const END_CARD_DURATION_FRAMES = 90; // 3 seconds at 30fps

export const VideoWithCaptions: React.FC<VideoWithCaptionsProps> = ({
  src,
  captions,
  durationInFrames,
  fps = 30,
  logoSrc,
  ctaText,
}) => {
  const mainVideoDuration = durationInFrames - END_CARD_DURATION_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Main video layer */}
      <Sequence from={0} durationInFrames={mainVideoDuration}>
        <AbsoluteFill>
          <OffthreadVideo
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>

        {/* Caption overlay on top of video */}
        <AbsoluteFill>
          <CaptionOverlay captions={captions} fps={fps} />
        </AbsoluteFill>
      </Sequence>

      {/* Brand end card appended after main video */}
      <Sequence
        from={mainVideoDuration}
        durationInFrames={END_CARD_DURATION_FRAMES}
      >
        <AbsoluteFill>
          <BrandEndCard logoSrc={logoSrc} ctaText={ctaText} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
