import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import type { AuditData } from "../data/sampleData";

export function Slide11End({ data }: { data: AuditData }) {
  return (
    <SlideTransition>
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-6xl font-black tracking-tight text-white md:text-8xl"
      >
        MAPS
        <br />
        <span className="bg-gradient-to-r from-[#0F9D9A] to-[#2ECC71] bg-clip-text text-transparent">
          AUTOPILOT
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-2xl font-semibold text-white"
      >
        {data.prospect_name}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-lg text-white/50"
      >
        {data.prospect_city}, {data.prospect_state}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-8 text-xl text-white/60"
      >
        Your Google Maps. Working Harder. Every Single Day.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-10 text-sm text-[#E63946]/70"
      >
        Your territory is open. Let's lock it in.
      </motion.p>
    </SlideTransition>
  );
}
