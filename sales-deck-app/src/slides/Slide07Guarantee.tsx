import { motion } from "framer-motion";
import { Shield, Target, Rocket, Grid3X3, Eye, Link, Globe } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";

interface GuaranteeConfig {
  icon: typeof Shield;
  color: string;
  headline: string;
  subtext: string;
  showPremiumFeatures?: boolean;
}

const tiers: Record<string, GuaranteeConfig> = {
  A: {
    icon: Shield,
    color: "#2ECC71",
    headline: "Top 3 in Google Maps in 90 Days — GUARANTEED",
    subtext: "If we don't hit it, we work up to 6 additional months at no extra cost.",
  },
  B: {
    icon: Target,
    color: "#0F9D9A",
    headline: "Measurable Improvement + 15 Tracked Calls/Mo by Day 90",
    subtext: "If we don't hit it, we work up to 6 additional months at no extra cost.",
  },
  C: {
    icon: Rocket,
    color: "#F1C40F",
    headline: "90-Day Performance Checkpoint",
    subtext: "If zero measurable improvement by day 90, you walk. No hard feelings.",
    showPremiumFeatures: true,
  },
};

const premiumFeatures = [
  { icon: Grid3X3, label: "Geo-grid tracking" },
  { icon: Eye, label: "Competitor monitoring" },
  { icon: Link, label: "Link building" },
  { icon: Globe, label: "Website audit" },
];

export function Slide07Guarantee({ tier }: { tier: string }) {
  const config = tiers[tier] || tiers.A;
  const Icon = config.icon;

  return (
    <SlideTransition>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-lg tracking-widest text-white/40 uppercase"
      >
        Our Guarantee
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          backgroundColor: `${config.color}20`,
          border: `2px solid ${config.color}40`,
          boxShadow: `0 0 30px ${config.color}20`,
        }}
      >
        <Icon className="h-12 w-12" style={{ color: config.color }} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-3xl text-center text-4xl font-bold leading-tight md:text-5xl"
        style={{ color: config.color }}
      >
        {config.headline}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 max-w-xl text-center text-xl font-light text-white/60"
      >
        {config.subtext}
      </motion.p>

      {config.showPremiumFeatures && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-10 grid grid-cols-2 gap-3"
        >
          {premiumFeatures.map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3"
            >
              <feat.icon className="h-4 w-4 text-[#F1C40F]" />
              <span className="text-sm text-white/70">{feat.label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Guarantee stands alone — no qualifiers needed */}
    </SlideTransition>
  );
}
