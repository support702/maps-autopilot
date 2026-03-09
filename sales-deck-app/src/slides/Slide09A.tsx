import { motion } from "framer-motion";
import type { AuditData } from "../data/sampleData";

interface Props {
  data: AuditData;
}

export function Slide09A({ data }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-4 text-center font-['Inter'] text-5xl font-extrabold tracking-[-0.03em] text-white"
      >
        Your Investment
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-16 text-center text-xl text-white/60"
      >
        Standard pricing for {data.niche_label}
      </motion.p>

      {/* Single Card - Month-to-Month */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="group relative overflow-hidden rounded-2xl bg-white/[0.07] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          {/* Card Header */}
          <div className="mb-6 text-center">
            <h3 className="mb-2 font-['Inter'] text-2xl font-extrabold tracking-[-0.03em] text-white">
              Month-to-Month
            </h3>
            <p className="text-sm text-white/50">Cancel anytime</p>
          </div>

          {/* Setup Fee - Big and Painful */}
          <div className="mb-6 rounded-xl bg-red-500/10 p-6 text-center">
            <div className="mb-2 text-sm uppercase tracking-wider text-red-400/80">
              Setup Fee
            </div>
            <div className="font-['Inter'] text-6xl font-extrabold tracking-[-0.03em] text-red-400">
              ${data.setup_fee}
            </div>
          </div>

          {/* Monthly Price */}
          <div className="mb-6 text-center">
            <div className="mb-2 text-sm uppercase tracking-wider text-white/50">
              Then Monthly
            </div>
            <div className="font-['Inter'] text-5xl font-extrabold tracking-[-0.03em] text-white">
              ${data.monthly_price}
              <span className="text-2xl text-white/40">/mo</span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 h-px bg-white/10" />

          {/* Year 1 Total */}
          <div className="text-center">
            <div className="mb-2 text-sm uppercase tracking-wider text-white/50">
              Year 1 Total
            </div>
            <div className="font-['Inter'] text-4xl font-extrabold tracking-[-0.03em] text-white/90">
              $
              {(
                parseInt(data.setup_fee.replace(/,/g, "")) +
                parseInt(data.monthly_price.replace(/,/g, "")) * 12
              ).toLocaleString()}
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/40" />
              <p className="text-sm text-white/60">No contract commitment</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/40" />
              <p className="text-sm text-white/60">Cancel with 30 days notice</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/40" />
              <p className="text-sm text-white/60">Full Maps Autopilot system</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
