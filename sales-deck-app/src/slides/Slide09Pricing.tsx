import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

function parseNum(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10);
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US");
}

export function Slide09Pricing({ data }: { data: AuditData }) {
  const monthlyPrice = parseNum(data.monthly_price);
  const setupFee = parseNum(data.setup_fee);
  const monthToMonthYear1 = setupFee + monthlyPrice * 12;
  const annualYear1 = monthlyPrice * 12;

  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-10 text-3xl font-bold text-white"
      >
        Two Options
      </motion.h2>

      <div className="flex w-full max-w-3xl flex-col items-center gap-8 sm:flex-row">
        {/* Month-to-Month */}
        <GlassCard
          glow="red"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 text-center opacity-80"
          style={{ transform: "scale(0.95)" }}
        >
          <h3 className="text-xl font-semibold text-white/70">Month-to-Month</h3>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm text-white/40">Setup fee</p>
              <p className="font-mono text-2xl font-bold text-white">
                ${formatPrice(setupFee)}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/40">Monthly</p>
              <p className="font-mono text-3xl font-bold text-white">
                ${formatPrice(monthlyPrice)}<span className="text-lg text-white/50">/mo</span>
              </p>
            </div>
            <p className="text-sm text-white/50">Cancel anytime.</p>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-white/30">Year 1 total</p>
              <p className="font-mono text-lg text-white/50">
                ${formatPrice(monthToMonthYear1)}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* 12-Month */}
        <GlassCard
          glow="green"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative flex-1 text-center"
          style={{ animation: "float-card 3s ease-in-out infinite" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2ECC71] px-4 py-1 text-xs font-bold text-black uppercase" style={{ boxShadow: "0 0 12px rgba(46, 204, 113, 0.4)" }}>
            Most Popular
          </div>
          <h3 className="mt-2 text-xl font-semibold text-[#2ECC71]">12-Month</h3>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm text-white/40">Setup fee</p>
              <p className="font-mono text-2xl font-bold text-[#2ECC71]">
                $0 <span className="text-sm font-normal text-[#2ECC71]/60">waived</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-white/40">Monthly</p>
              <p className="font-mono text-3xl font-bold text-white">
                ${formatPrice(monthlyPrice)}<span className="text-lg text-white/50">/mo</span>
              </p>
            </div>
            <p className="text-sm font-semibold text-[#2ECC71]">
              Save ${formatPrice(setupFee)}
            </p>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-white/30">Year 1 total</p>
              <p className="font-mono text-lg text-[#2ECC71]">
                ${formatPrice(annualYear1)}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-10 text-xl text-white/50"
      >
        Which option works better for you?
      </motion.p>
    </SlideTransition>
  );
}
