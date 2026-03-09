import { motion } from "framer-motion";
import { Search, Star, FileText, Globe } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";

const phases = [
  {
    icon: Search,
    color: "#0F9D9A",
    title: "GBP Optimization",
    desc: "Complete profile, categories, products, Q&A seeding",
  },
  {
    icon: Star,
    color: "#F1C40F",
    title: "Review Engine",
    desc: "Automated review requests + AI-powered responses",
  },
  {
    icon: FileText,
    color: "#2ECC71",
    title: "Content Machine",
    desc: "3 GBP posts/week with AI-generated content & images",
  },
  {
    icon: Globe,
    color: "#E63946",
    title: "Citation Building",
    desc: "NAP consistency across 50+ directories",
  },
];

export function Slide04Phase1() {
  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-lg tracking-widest text-white/40 uppercase"
      >
        Phase 1
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-10 text-4xl font-bold text-white"
      >
        90-Day Sprint
      </motion.p>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {phases.map((p, i) => (
          <GlassCard
            key={p.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${p.color}20` }}
            >
              <p.icon className="h-5 w-5" style={{ color: p.color }} />
            </div>
            <h3 className="text-lg font-semibold text-white">{p.title}</h3>
            <p className="mt-1 text-sm text-white/50">{p.desc}</p>
          </GlassCard>
        ))}
      </div>
    </SlideTransition>
  );
}
