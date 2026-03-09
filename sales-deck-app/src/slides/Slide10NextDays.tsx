import { motion } from "framer-motion";
import { FileCheck, ClipboardList, Search, Phone, Settings, Newspaper, Star } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";

const timeline = [
  { day: 1, label: "Sign Agreement", desc: "Lock your territory + collect payment", icon: FileCheck, color: "#0F9D9A" },
  { day: 2, label: "Onboarding Survey", desc: "5-minute setup survey", icon: ClipboardList, color: "#0F9D9A" },
  { day: 3, label: "GBP Audit", desc: "Website health scan runs automatically", icon: Search, color: "#2ECC71" },
  { day: 4, label: "Strategy Call", desc: "Account manager calls with results", icon: Phone, color: "#2ECC71" },
  { day: 5, label: "Setup Begins", desc: "GBP optimization begins", icon: Settings, color: "#F1C40F" },
  { day: 6, label: "First Content", desc: "First 3 posts published to Google", icon: Newspaper, color: "#F1C40F" },
  { day: 7, label: "Review System Live", desc: "Review system activated — you're live", icon: Star, color: "#E63946" },
];

export function Slide10NextDays() {
  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-lg tracking-widest text-white/40 uppercase"
      >
        Getting Started
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-10 text-4xl font-bold text-white"
      >
        Your First 7 Days
      </motion.p>

      <div className="relative flex w-full max-w-xl flex-col gap-0">
        {/* Animated vertical line */}
        <div className="absolute left-5 top-2 bottom-2 w-px overflow-hidden">
          <div
            className="w-full bg-gradient-to-b from-[#0F9D9A] via-[#F1C40F] to-[#E63946]"
            style={{ animation: "draw-line 1.5s ease-out 0.3s forwards", height: 0 }}
          />
        </div>

        {timeline.map((item, i) => (
          <motion.div
            key={item.day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.35 }}
            className="relative flex items-center gap-4 py-3 pl-0"
          >
            <div
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${item.color}20`, border: `2px solid ${item.color}50` }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div>
              <span className="font-mono text-xs text-white/30">Day {item.day}</span>
              <p className="text-lg font-semibold text-white">{item.label}</p>
              <p className="text-sm text-white/40">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </SlideTransition>
  );
}
