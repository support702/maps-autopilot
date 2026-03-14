import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

interface CaptionWord {
  word: string;
  start: number; // frame-based
  end: number; // frame-based
}

interface CaptionOverlayProps {
  captions: CaptionWord[];
  fps: number;
}

const HIGHLIGHT_COLOR = "#F5820A";
const DEFAULT_COLOR = "#FFFFFF";
const WINDOW_SIZE = 5;

function getActiveWindowIndex(
  captions: CaptionWord[],
  currentFrame: number
): number {
  for (let i = 0; i < captions.length; i++) {
    if (currentFrame >= captions[i].start && currentFrame <= captions[i].end) {
      return i;
    }
  }
  // If between words, find the next upcoming word
  for (let i = 0; i < captions.length; i++) {
    if (currentFrame < captions[i].start) {
      return Math.max(0, i - 1);
    }
  }
  return captions.length - 1;
}

function getWindowRange(
  activeIndex: number,
  totalWords: number
): { windowStart: number; windowEnd: number } {
  const half = Math.floor(WINDOW_SIZE / 2);
  let windowStart = Math.max(0, activeIndex - half);
  let windowEnd = windowStart + WINDOW_SIZE;

  if (windowEnd > totalWords) {
    windowEnd = totalWords;
    windowStart = Math.max(0, windowEnd - WINDOW_SIZE);
  }

  return { windowStart, windowEnd };
}

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  captions,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  if (captions.length === 0) {
    return null;
  }

  const activeIndex = getActiveWindowIndex(captions, frame);
  const isActiveWord =
    frame >= captions[activeIndex].start &&
    frame <= captions[activeIndex].end;

  const { windowStart, windowEnd } = getWindowRange(
    activeIndex,
    captions.length
  );
  const visibleWords = captions.slice(windowStart, windowEnd);

  // Scale pop animation for active word
  const scaleProgress = isActiveWord
    ? spring({
        frame: frame - captions[activeIndex].start,
        fps,
        config: {
          damping: 12,
          stiffness: 200,
          mass: 0.5,
        },
      })
    : 1;

  const scale = isActiveWord
    ? interpolate(scaleProgress, [0, 0.5, 1], [1.0, 1.15, 1.0])
    : 1.0;

  const fontSize = Math.round(width * 0.045);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "18%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {visibleWords.map((caption, i) => {
          const globalIndex = windowStart + i;
          const isCurrent = globalIndex === activeIndex && isActiveWord;
          const isPast = globalIndex < activeIndex;

          return (
            <span
              key={`${globalIndex}-${caption.word}`}
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize,
                color: isCurrent ? HIGHLIGHT_COLOR : DEFAULT_COLOR,
                WebkitTextStroke: "2px black",
                paintOrder: "stroke fill",
                transform: isCurrent ? `scale(${scale})` : "scale(1)",
                opacity: isPast ? 0.7 : 1,
                display: "inline-block",
                transition: "opacity 0.1s ease",
              }}
            >
              {caption.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
