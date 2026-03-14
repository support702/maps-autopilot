import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
} from "remotion";

interface BrandEndCardProps {
  logoSrc?: string;
  ctaText?: string;
}

const BG_COLOR = "#0A0A0C";
const CTA_COLOR = "#F5820A";
const FADE_DURATION_FRAMES = 15;

export const BrandEndCard: React.FC<BrandEndCardProps> = ({
  logoSrc,
  ctaText = "Follow for more!",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const opacity = interpolate(frame, [0, FADE_DURATION_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(
    frame,
    [FADE_DURATION_FRAMES, FADE_DURATION_FRAMES + 15],
    [0.8, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const ctaOpacity = interpolate(
    frame,
    [FADE_DURATION_FRAMES + 10, FADE_DURATION_FRAMES + 25],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const resolvedLogoSrc = logoSrc ?? staticFile("logo.png");
  const logoSize = Math.min(width, height) * 0.3;
  const fontSize = Math.round(width * 0.04);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        opacity,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 30,
      }}
    >
      <div
        style={{
          transform: `scale(${logoScale})`,
        }}
      >
        <Img
          src={resolvedLogoSrc}
          style={{
            width: logoSize,
            height: logoSize,
            objectFit: "contain",
          }}
        />
      </div>
      <div
        style={{
          opacity: ctaOpacity,
          color: CTA_COLOR,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize,
          textAlign: "center",
          padding: "0 40px",
        }}
      >
        {ctaText}
      </div>
    </div>
  );
};
