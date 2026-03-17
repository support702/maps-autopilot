import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

export function Slide03BKeywordGap({ data }: { data: AuditData }) {
  const gap = data.keywordGap;
  if (!gap) return null;

  const visibilityPercent = Math.round((gap.visible / gap.total) * 100);
  const isGoodScore = visibilityPercent >= 50;
  const cleanKeyword = (kw: string) => kw.replace(/ near me$/i, '');

  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-4xl font-bold text-white"
      >
        The <span className="text-[#F5820A]">Keyword</span> Gap
      </motion.h2>

      {/* Two-Column Scorecard */}
      <div className="mb-8 flex w-full max-w-5xl gap-6">
        {/* Prospect Score */}
        <GlassCard
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 text-center"
        >
          <h3 className="mb-2 text-lg font-semibold text-white/70">Your Visibility</h3>
          <p className={`mb-2 text-6xl font-black ${isGoodScore ? 'text-emerald-400' : 'text-red-400'}`}>
            {gap.visible}/{gap.total}
          </p>
          <p className="text-sm text-white/50">
            You rank for {gap.visible} out of {gap.total} high-ticket keywords
          </p>
        </GlassCard>

        {/* Competitor Score */}
        <GlassCard
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 text-center"
        >
          <h3 className="mb-2 text-lg font-semibold text-white/70">
            {gap.dominantCompetitor === 'Unknown' ? 'Market Leader' : gap.dominantCompetitor}
          </h3>
          <p className="mb-2 text-6xl font-black text-emerald-400">
            {gap.dominantCompetitorKeywords}/{gap.total}
          </p>
          <p className="text-sm text-white/50">
            Ranks for {gap.dominantCompetitorKeywords} out of {gap.total} keywords
          </p>
        </GlassCard>
      </div>

      {/* Keyword Breakdown List */}
      <GlassCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-5xl"
      >
        <div className="max-h-[400px] space-y-2 overflow-y-auto pr-4">
          {gap.keywords.map((kw, i) => (
            <motion.div
              key={kw.keyword}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
            >
              {/* Left: Check/X */}
              <div className="flex items-center gap-3 flex-1">
                <span className={`text-2xl font-bold ${kw.visible ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kw.visible ? '✓' : '✗'}
                </span>
                <span className="text-base font-medium text-white">
                  {cleanKeyword(kw.keyword)}
                </span>
              </div>

              {/* Right: Rank Status */}
              <div className="text-right">
                {kw.visible && kw.rank ? (
                  <span className="text-sm font-bold text-emerald-400">
                    You're #{kw.rank}
                  </span>
                ) : (
                  <span className="text-sm text-red-400/70">
                    Not ranking in top 20
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Bottom Warning */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-2xl font-medium text-white/70"
      >
        Every keyword you don't rank for is a customer calling someone else.
      </motion.p>
    </SlideTransition>
  );
}
