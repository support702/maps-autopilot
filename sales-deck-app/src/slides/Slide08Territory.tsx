import { motion } from "framer-motion";
import { Lock, MapPin } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";
import type { AuditData } from "../data/sampleData";

function PulseRing({ delay, size }: { delay: number; size: number }) {
  return (
    <div
      className="absolute rounded-full border border-[#0F9D9A]"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        animation: `sonar-ping 4s ease-out ${delay}s infinite`,
      }}
    />
  );
}

export function Slide08Territory({ data }: { data: AuditData }) {
  return (
    <SlideTransition>
      <div className="relative flex flex-col items-center">
        <div className="relative mb-12 flex h-64 w-64 items-center justify-center">
          <PulseRing delay={0} size={120} />
          <PulseRing delay={2} size={120} />
          <PulseRing delay={4} size={120} />
          <PulseRing delay={6} size={120} />

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-[#0F9D9A]/20 ring-2 ring-[#0F9D9A]/40"
          >
            <MapPin className="h-10 w-10 text-[#0F9D9A]" />
          </motion.div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-5xl font-bold text-white md:text-6xl"
        >
          {data.prospect_city}, {data.prospect_state}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 flex items-center gap-2 rounded-full border border-[#F1C40F]/30 bg-[#F1C40F]/10 px-6 py-3"
        >
          <Lock className="h-4 w-4 text-[#F1C40F]" />
          <span className="text-lg font-semibold text-[#F1C40F]">
            Only 1 spot available in {data.prospect_city}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-6 max-w-xl text-center text-lg text-white/70"
        >
          When you sign,{" "}
          <span className="font-bold text-[#E63946]">{data.comp1_name}</span>{" "}
          can <span className="font-bold">NEVER</span> use our system for
          "{data.niche_label}" in your area.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-4 text-xl font-bold text-[#E63946]"
          style={{
            animation: "pulse-red 2s ease-in-out infinite",
          }}
        >
          Your territory is open RIGHT NOW.
        </motion.p>

        <style>{`
          @keyframes pulse-red {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9 }}
          className="mt-3 text-sm text-white/30"
        >
          We work with one {data.niche_label} per territory. No exceptions.
        </motion.p>
      </div>
    </SlideTransition>
  );
}
