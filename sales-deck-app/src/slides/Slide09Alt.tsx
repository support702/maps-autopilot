import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";
import { AnimatedCounter } from "../components/AnimatedCounter";
import type { AuditData } from "../data/sampleData";

function parseNum(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10);
}

export function Slide09Alt({ data }: { data: AuditData }) {
  const lostMonthly = parseNum(data.lost_monthly || data.opportunity_monthly || "0");
  const lostAnnual = parseNum(data.lost_annual || data.opportunity_annual || "0");
  const monthlyPrice = parseNum(data.monthly_price);
  const setupFee = parseNum(data.setup_fee);
  const roiMultiple = Math.round(lostMonthly / monthlyPrice);

  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-10 text-3xl font-bold text-white"
      >
        The Choice Is Yours
      </motion.h2>

      <div className="flex w-full max-w-3xl flex-col items-center gap-8 sm:flex-row">
        {/* Do Nothing */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl border border-[#E63946]/20 bg-[#E63946]/5 p-8 text-center"
          style={{ backgroundImage: "linear-gradient(to bottom, transparent 85%, rgba(230, 57, 70, 0.05) 100%)" }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E63946]/20">
            <TrendingDown className="h-6 w-6 text-[#E63946]" />
          </div>
          <h3 className="text-xl font-semibold text-[#E63946]">Do Nothing</h3>
          <div className="mt-6 space-y-3">
            <p className="text-sm text-white/40">Lost per month</p>
            <p className="font-mono text-3xl font-bold text-[#E63946]">
              <AnimatedCounter target={lostMonthly} prefix="-$" />
            </p>
            <p className="text-sm text-white/40">Lost per year</p>
            <p className="font-mono text-2xl font-bold text-[#E63946]/80">
              <AnimatedCounter target={lostAnnual} prefix="-$" />
            </p>
          </div>
          <p className="mt-6 text-sm text-white/30">Keep falling behind</p>
        </motion.div>

        {/* VS Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10"
        >
          <ArrowRight className="h-5 w-5 text-white/60" />
        </motion.div>

        {/* Maps Autopilot */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl border border-[#2ECC71]/30 bg-[#2ECC71]/5 p-8 text-center ring-2 ring-[#2ECC71]/20"
          style={{ backgroundImage: "linear-gradient(to bottom, transparent 85%, rgba(46, 204, 113, 0.05) 100%)" }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2ECC71]/20">
            <TrendingUp className="h-6 w-6 text-[#2ECC71]" />
          </div>
          <h3 className="text-xl font-semibold text-[#2ECC71]">Maps Autopilot</h3>
          <div className="mt-6 space-y-3">
            <p className="text-sm text-white/40">Monthly investment</p>
            <p className="font-mono text-3xl font-bold text-[#2ECC71]">
              <AnimatedCounter target={monthlyPrice} prefix="$" suffix="/mo" />
            </p>
            <p className="text-sm text-white/40">One-time setup</p>
            <p className="font-mono text-2xl font-bold text-[#2ECC71]/80">
              <AnimatedCounter target={setupFee} prefix="$" />
            </p>
          </div>
          <p className="mt-6 text-sm text-white/50">
            <span className="font-semibold text-[#2ECC71]">{roiMultiple}x ROI</span>{" "}
            potential return
          </p>
        </motion.div>
      </div>
    </SlideTransition>
  );
}
