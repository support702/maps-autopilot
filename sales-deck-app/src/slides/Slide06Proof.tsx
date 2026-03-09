import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

export function Slide06Proof({ data }: { data: AuditData }) {
  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-10 text-4xl font-bold text-white"
      >
        What Our Clients See
      </motion.h2>

      <div className="flex w-full max-w-4xl flex-col gap-4">
        {/* Top card — full width */}
        <GlassCard
          glow="teal"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center"
        >
          <p className="text-2xl font-semibold text-white md:text-3xl">
            Businesses in positions 1-3 see{" "}
            <span className="text-[#0F9D9A]">15-50 calls/month</span>{" "}
            from Maps alone
          </p>
        </GlassCard>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Bottom left — Week 1 */}
          <GlassCard
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <h3 className="mb-4 text-xl font-bold text-white">What Week 1 Looks Like</h3>
            <ul className="space-y-2 text-left text-white/70">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F9D9A]" />
                GBP overhaul complete
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F9D9A]" />
                First 3 posts published
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F9D9A]" />
                Citations submitted to 40+ directories
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F9D9A]" />
                Review system activated
              </li>
            </ul>
          </GlassCard>

          {/* Bottom right — Founder framing */}
          <GlassCard
            glow="gold"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <p className="text-lg leading-relaxed text-white/80 italic">
              "We're early in{" "}
              <span className="font-semibold text-[#F1C40F]">{data.niche_label}</span>.
              That's why the deal is skewed in your favor. Someone gets founder pricing and
              our best attention — we want that to be you, not the shop down the street."
            </p>
          </GlassCard>
        </div>
      </div>
    </SlideTransition>
  );
}
