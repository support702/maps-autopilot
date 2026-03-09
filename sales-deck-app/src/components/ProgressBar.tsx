import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
  accentColor?: string;
}

export function ProgressBar({ current, total, accentColor = "#0F9D9A" }: ProgressBarProps) {
  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-black/40 px-6 py-3 backdrop-blur-md">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const isPast = i < current;
        return (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{
              width: isActive ? 10 : 6,
              height: isActive ? 10 : 6,
              backgroundColor: isActive
                ? accentColor
                : isPast
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.12)",
              boxShadow: isActive
                ? `0 0 8px ${accentColor}, 0 0 16px ${accentColor}60`
                : "none",
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        );
      })}
      <span className="ml-2 font-mono text-xs text-white/50">
        {current + 1}/{total}
      </span>
    </div>
  );
}
