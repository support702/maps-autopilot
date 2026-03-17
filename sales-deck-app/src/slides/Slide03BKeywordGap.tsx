import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

export function Slide03BKeywordGap({ data }: { data: AuditData }) {
  const gap = data.keywordGap;
  if (!gap) return null;

  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-4xl font-bold text-white"
      >
        Your <span className="text-[#4ECDC4]">Keyword</span> Visibility
      </motion.h2>

      <div className="flex w-full max-w-4xl gap-6">
        {/* Prospect Scorecard */}
        <GlassCard
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1"
        >
          <h3 className="mb-4 text-center text-lg font-semibold text-white">
            {data.prospect_name}
          </h3>
          <p className="mb-3 text-center text-sm text-white/40">
            {gap.visible}/{gap.total} keywords ranked
          </p>
          <div className="space-y-2">
            {gap.keywords.map((kw, i) => (
              <motion.div
                key={kw.keyword}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              >
                <span className="text-sm text-white/70">{kw.keyword}</span>
                {kw.visible ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                    ✓ #{kw.rank}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-red-400">✗</span>
                )}
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* VS Divider */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center"
        >
          <span className="text-2xl font-black text-white/20">VS</span>
        </motion.div>

        {/* Competitor Scorecard */}
        <GlassCard
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1"
        >
          <h3 className="mb-4 text-center text-lg font-semibold text-[#4ECDC4]">
            {gap.dominantCompetitor}
          </h3>
          <p className="mb-3 text-center text-sm text-white/40">
            {gap.dominantCompetitorKeywords}/{gap.total} keywords ranked
          </p>
          <div className="space-y-2">
            {gap.keywords.map((kw, i) => (
              <motion.div
                key={kw.keyword}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              >
                <span className="text-sm text-white/70">{kw.keyword}</span>
                <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                  ✓ #1
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Gap Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-8 text-center"
      >
        <p className="text-5xl font-black text-[#4ECDC4]">{gap.score}/100</p>
        <p className="mt-1 text-sm text-white/40">Keyword Visibility Score</p>
      </motion.div>

      {/* Bottom CTA */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-6 max-w-xl text-center text-lg italic text-red-400/80"
      >
        Every keyword you don't rank for is a customer calling someone else.
      </motion.p>
    </SlideTransition>
  );
}
