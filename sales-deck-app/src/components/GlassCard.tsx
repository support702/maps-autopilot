import { motion, type HTMLMotionProps } from "framer-motion";

const glowColors = {
  red: { ring: "rgba(230, 57, 70, 0.3)", shadow: "rgba(230, 57, 70, 0.15)" },
  green: { ring: "rgba(46, 204, 113, 0.3)", shadow: "rgba(46, 204, 113, 0.15)" },
  teal: { ring: "rgba(15, 157, 154, 0.3)", shadow: "rgba(15, 157, 154, 0.15)" },
  gold: { ring: "rgba(241, 196, 15, 0.3)", shadow: "rgba(241, 196, 15, 0.15)" },
} as const;

type GlowColor = keyof typeof glowColors;

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: GlowColor;
  hoverable?: boolean;
}

export function GlassCard({ children, className = "", glow, hoverable = false, style, ...props }: GlassCardProps) {
  const glowStyle = glow
    ? {
        borderColor: glowColors[glow].ring,
        boxShadow: `0 0 20px ${glowColors[glow].shadow}, 0 0 40px ${glowColors[glow].shadow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }
    : {
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      };

  return (
    <motion.div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.07] p-8 backdrop-blur-2xl ${className}`}
      style={{
        ...glowStyle,
        transition: hoverable ? "transform 200ms ease, box-shadow 200ms ease" : undefined,
        ...style,
      }}
      whileHover={hoverable ? { y: -2, boxShadow: `0 8px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)${glow ? `, 0 0 20px ${glowColors[glow].shadow}, 0 0 40px ${glowColors[glow].shadow}` : ""}` } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
