import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

function parseNum(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10);
}

export function Slide03MoneyMath({ data }: { data: AuditData }) {
  const missedCalls = parseNum(data.missed_calls);
  const avgTicket = parseNum(data.avg_ticket);
  const lostMonthly = parseNum(data.lost_monthly);
  const lostAnnual = parseNum(data.lost_annual);

  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-4xl font-bold text-white"
      >
        The Money You're{" "}
        <span className="text-[#E63946]">Leaving on the Table</span>
      </motion.h2>

      <div className="flex w-full max-w-3xl flex-col items-center gap-6">
        <div className="flex w-full flex-wrap justify-center gap-4">
          <GlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 text-center"
          >
            <p className="text-sm text-white/40">Missed Calls / Month</p>
            <p className="mt-2 font-mono text-4xl font-bold text-white">
              <AnimatedCounter target={missedCalls} />
            </p>
          </GlassCard>

          <div className="flex items-center text-3xl text-white/30">&times;</div>

          <GlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1 text-center"
          >
            <p className="text-sm text-white/40">Avg Ticket</p>
            <p className="mt-2 font-mono text-4xl font-bold text-white">
              <AnimatedCounter target={avgTicket} prefix="$" />
            </p>
          </GlassCard>
        </div>

        <div className="text-2xl text-white/30">=</div>

        <GlassCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="relative w-full overflow-hidden text-center"
          style={{ backgroundImage: "linear-gradient(to bottom, transparent 80%, rgba(230, 57, 70, 0.05) 100%)" }}
        >
          <p className="text-sm text-white/40">Lost Revenue / Month</p>
          <p className="mt-2 font-mono text-6xl font-bold text-[#E63946]">
            <AnimatedCounter target={lostMonthly} prefix="$" duration={1.8} />
          </p>
        </GlassCard>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-2 w-full rounded-2xl border border-[#E63946]/30 bg-[#E63946]/10 p-8 text-center"
          style={{ animation: "pulse-red-glow 2s ease-in-out infinite" }}
        >
          <p className="text-sm tracking-widest text-[#E63946]/60 uppercase">
            That's over
          </p>
          <p className="mt-2 font-mono text-8xl font-black text-[#E63946]">
            <AnimatedCounter target={lostAnnual} prefix="$" duration={2} />
          </p>
          <p className="mt-1 text-lg text-[#E63946]/80">per year</p>
        </motion.div>
      </div>
    </SlideTransition>
  );
}
