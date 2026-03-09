import { motion } from "framer-motion";
import { Newspaper, MessageSquare, Eye, BarChart3, HeartPulse, Bot } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";

const features = [
  { icon: Newspaper, label: "Content Publishing", desc: "3x weekly GBP posts" },
  { icon: MessageSquare, label: "Review Monitoring", desc: "Auto-respond 24/7" },
  { icon: Eye, label: "Competitor Tracking", desc: "Weekly ranking scans" },
  { icon: BarChart3, label: "Performance Reports", desc: "Monthly ROI reports" },
  { icon: HeartPulse, label: "Health Checks", desc: "Daily system monitoring" },
  { icon: Bot, label: "AI Visibility", desc: "ChatGPT & Perplexity audits" },
];

export function Slide05Phase2() {
  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-lg tracking-widest text-white/40 uppercase"
      >
        Phase 2
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-10 text-4xl font-bold text-white"
      >
        Monthly Autopilot
      </motion.p>

      <div className="grid w-full max-w-3xl grid-cols-2 gap-6 sm:grid-cols-3">
        {features.map((f, i) => (
          <GlassCard
            key={f.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.35 }}
            className="text-center"
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <f.icon className="h-5 w-5 text-[#0F9D9A]" />
            </div>
            <h3 className="text-sm font-semibold text-white">{f.label}</h3>
            <p className="mt-1 text-xs text-white/40">{f.desc}</p>
          </GlassCard>
        ))}
      </div>
    </SlideTransition>
  );
}
