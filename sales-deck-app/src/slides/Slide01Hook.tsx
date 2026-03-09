import { motion } from "framer-motion";
import { SlideTransition } from "../components/SlideTransition";
import type { AuditData } from "../data/sampleData";

export function Slide01Hook({ data }: { data: AuditData }) {
  return (
    <SlideTransition>
      <div className="max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 text-lg tracking-widest text-[#E63946] uppercase"
        >
          {data.prospect_city}, {data.prospect_state}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-4 text-6xl font-bold leading-tight text-white md:text-8xl"
        >
          Is Google Maps{" "}
          <span className="text-[#2ECC71]">sending</span>{" "}
          or{" "}
          <span className="text-[#E63946]">stealing</span>{" "}
          you money?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-base text-white/50"
        >
          A data-driven audit for{" "}
          <span className="font-semibold text-white">{data.prospect_name}</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-3 text-xs text-white/20"
        >
          Prepared by Maps Autopilot
        </motion.p>
      </div>
    </SlideTransition>
  );
}
