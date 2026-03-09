import { motion } from "framer-motion";
import type { AuditData } from "../data/sampleData";

interface Props {
  data: AuditData;
}

export function Slide09B({ data }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-4 text-center font-['Inter'] text-5xl font-extrabold tracking-[-0.03em] text-white"
      >
        But most owners choose this
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-16 text-center text-xl text-white/60"
      >
        Save ${data.setup_fee} and lock your price for 12 months
      </motion.p>

      {/* Two Cards Side by Side */}
      <div className="grid w-full max-w-5xl grid-cols-2 gap-8">
        {/* Left Card - Month-to-Month (Dimmed) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 0.4, x: 0, scale: 0.95 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.05] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
            {/* Card Header */}
            <div className="mb-6 text-center">
              <h3 className="mb-2 font-['Inter'] text-2xl font-extrabold tracking-[-0.03em] text-white/70">
                Month-to-Month
              </h3>
              <p className="text-sm text-white/40">Cancel anytime</p>
            </div>

            {/* Setup Fee */}
            <div className="mb-6 rounded-xl bg-red-500/5 p-4 text-center">
              <div className="mb-1 text-xs uppercase tracking-wider text-red-400/60">
                Setup Fee
              </div>
              <div className="font-['Inter'] text-4xl font-extrabold tracking-[-0.03em] text-red-400/70">
                ${data.setup_fee}
              </div>
            </div>

            {/* Monthly Price */}
            <div className="mb-4 text-center">
              <div className="mb-1 text-xs uppercase tracking-wider text-white/40">
                Then Monthly
              </div>
              <div className="font-['Inter'] text-3xl font-extrabold tracking-[-0.03em] text-white/70">
                ${data.monthly_price}
                <span className="text-xl text-white/30">/mo</span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-white/5" />

            {/* Year 1 Total */}
            <div className="text-center">
              <div className="mb-1 text-xs uppercase tracking-wider text-white/40">
                Year 1 Total
              </div>
              <div className="font-['Inter'] text-3xl font-extrabold tracking-[-0.03em] text-white/60">
                $
                {(
                  parseInt(data.setup_fee.replace(/,/g, "")) +
                  parseInt(data.monthly_price.replace(/,/g, "")) * 12
                ).toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Card - 12-Month (Highlighted, Floating, Green Glow) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1.05,
            y: [-4, 4, -4],
          }}
          transition={{
            delay: 0.6,
            duration: 0.8,
            y: {
              repeat: Infinity,
              duration: 4,
              ease: "easeInOut",
            },
          }}
          className="relative"
        >
          {/* Green Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 blur-xl" />

          <div className="relative overflow-hidden rounded-2xl bg-white/[0.1] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
            {/* Popular Badge */}
            <div className="absolute right-4 top-4 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">
              Most Popular
            </div>

            {/* Card Header */}
            <div className="mb-6 text-center">
              <h3 className="mb-2 font-['Inter'] text-2xl font-extrabold tracking-[-0.03em] text-white">
                12-Month Agreement
              </h3>
              <p className="text-sm text-green-400">Best value</p>
            </div>

            {/* Setup Fee - WAIVED with strikethrough */}
            <div className="mb-6 rounded-xl bg-green-500/10 p-4 text-center">
              <div className="mb-1 text-xs uppercase tracking-wider text-green-400/80">
                Setup Fee
              </div>
              <div className="relative">
                <div className="font-['Inter'] text-4xl font-extrabold tracking-[-0.03em] text-white/30 line-through">
                  ${data.setup_fee}
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className="mt-2 font-['Inter'] text-5xl font-extrabold tracking-[-0.03em] text-green-400"
                >
                  $0
                </motion.div>
              </div>
            </div>

            {/* Monthly Price */}
            <div className="mb-4 text-center">
              <div className="mb-1 text-xs uppercase tracking-wider text-white/50">
                Monthly
              </div>
              <div className="font-['Inter'] text-3xl font-extrabold tracking-[-0.03em] text-white">
                ${data.monthly_price}
                <span className="text-xl text-white/40">/mo</span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-white/10" />

            {/* Year 1 Total */}
            <div className="text-center">
              <div className="mb-1 text-xs uppercase tracking-wider text-white/50">
                Year 1 Total
              </div>
              <div className="font-['Inter'] text-3xl font-extrabold tracking-[-0.03em] text-green-400">
                ${(parseInt(data.monthly_price.replace(/,/g, "")) * 12).toLocaleString()}
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                className="mt-2 text-sm font-bold text-green-400"
              >
                Save ${data.setup_fee}
              </motion.div>
            </div>

            {/* Features */}
            <div className="mt-6 space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                <p className="text-xs text-white/80">12-month price lock</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                <p className="text-xs text-white/80">Setup fee waived</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                <p className="text-xs text-white/80">Full Maps Autopilot system</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
