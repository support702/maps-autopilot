import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

function parseNum(s: string): number {
  // Handle ranges like '11,250-15,750' by taking the higher number
  if (typeof s === "string" && s.includes("-")) {
    const parts = s.split("-");
    s = parts[parts.length - 1];
  }
  const cleaned = String(s).replace(/[,$]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function Slide03MoneyMath({ data }: { data: AuditData }) {
  const top3Calls = parseNum(data.top3_estimated_calls);
  const prospectCalls = parseNum(data.prospect_estimated_calls);
  const gapCalls = parseNum(data.opportunity_gap_calls);
  const oppMonthly = parseNum(data.opportunity_monthly);
  const oppAnnual = parseNum(data.opportunity_annual);

  const rank = data.prospect_rank;
  const prospectReviews = data.prospect_reviews;
  const topCompReviews = data.comp1_reviews;

  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-4xl font-bold text-white"
      >
        The <span className="text-[#4ECDC4]">Opportunity</span> in Front of You
      </motion.h2>

      <div className="flex w-full max-w-3xl flex-col items-center gap-6">
        {/* The Gap Section */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-lg leading-relaxed text-white/70"
        >
          The top 3 in {data.prospect_city} receive an estimated{" "}
          <span className="font-bold text-white">{data.top3_estimated_calls} calls/month</span>{" "}
          from Google Maps.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-base text-white/50"
        >
          At position {rank} with {prospectReviews} reviews vs their {topCompReviews} — you're
          capturing a fraction of that traffic.
        </motion.p>

        <div className="flex w-full flex-wrap justify-center gap-4">
          <GlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1 text-center"
          >
            <p className="text-sm text-white/40">Top 3 Est. Calls/Mo</p>
            <p className="mt-2 font-mono text-4xl font-bold text-[#4ECDC4]">
              <AnimatedCounter target={top3Calls} />
            </p>
          </GlassCard>

          <GlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex-1 text-center"
          >
            <p className="text-sm text-white/40">Your Est. Calls/Mo</p>
            <p className="mt-2 font-mono text-4xl font-bold text-white">
              <AnimatedCounter target={prospectCalls} />
            </p>
          </GlassCard>
        </div>

        {/* The Opportunity Section */}
        <GlassCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full text-center"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 80%, rgba(78, 205, 196, 0.05) 100%)",
          }}
        >
          <p className="text-sm text-white/40">Additional Calls by Reaching Top 3</p>
          <p className="mt-2 font-mono text-5xl font-bold text-[#4ECDC4]">
            +<AnimatedCounter target={gapCalls} />
          </p>
          <p className="mt-1 text-sm text-white/40">calls/month</p>
        </GlassCard>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-center text-base text-white/50"
        >
          At your ${data.avg_ticket} avg ticket:
        </motion.p>

        <div className="flex w-full flex-wrap justify-center gap-4">
          <GlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex-1 text-center"
          >
            <p className="text-sm text-white/40">New Revenue / Month</p>
            <p className="mt-2 font-mono text-4xl font-bold text-[#4ECDC4]">
              <AnimatedCounter target={oppMonthly} prefix="$" duration={1.8} />
            </p>
          </GlassCard>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-2 w-full rounded-2xl border border-[#4ECDC4]/30 bg-[#4ECDC4]/10 p-8 text-center"
          style={{ animation: "pulse-red-glow 2s ease-in-out infinite" }}
        >
          <p className="text-sm tracking-widest text-[#4ECDC4]/60 uppercase">
            Annual opportunity
          </p>
          <p className="mt-2 font-mono text-8xl font-black text-[#4ECDC4]">
            <AnimatedCounter target={oppAnnual} prefix="$" duration={2} />
          </p>
          <p className="mt-1 text-lg text-[#4ECDC4]/80">
            per year from a ${data.monthly_price}/month investment
          </p>
        </motion.div>
      </div>
    </SlideTransition>
  );
}
