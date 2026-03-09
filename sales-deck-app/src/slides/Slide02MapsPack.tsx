import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import { SlideTransition } from "../components/SlideTransition";
import { GlassCard } from "../components/GlassCard";
import type { AuditData } from "../data/sampleData";

interface CompetitorCardProps {
  rank: number;
  name: string;
  reviews: string;
  rating: string;
  isProspect?: boolean;
  delay: number;
}

function CompetitorCard({ rank, name, reviews, rating, isProspect, delay }: CompetitorCardProps) {
  return (
    <GlassCard
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex items-center gap-4 ${
        isProspect
          ? "border-[#E63946]/60 bg-[#E63946]/10 ring-2 ring-[#E63946]/30"
          : ""
      }`}
      style={isProspect ? { animation: "pulse-red-border 2s ease-in-out infinite" } : undefined}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-lg font-bold ${
          isProspect ? "bg-[#E63946] text-white" : "bg-white/10 text-white/70"
        }`}
      >
        {rank}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">
          {name}
          {isProspect && (
            <span className="ml-2 rounded bg-[#E63946]/30 px-2 py-0.5 text-xs text-[#E63946]">
              YOU
            </span>
          )}
        </p>
        <div className="mt-1 flex items-center gap-3 text-sm text-white/50">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[#F1C40F] text-[#F1C40F]" />
            {rating}
          </span>
          <span>{reviews} reviews</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function Slide02MapsPack({ data }: { data: AuditData }) {
  return (
    <SlideTransition>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-lg tracking-widest text-white/40 uppercase"
      >
        Google Maps Pack
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8 text-3xl font-bold text-white"
      >
        "{data.niche_label}" in {data.prospect_city}
      </motion.p>

      <div className="flex w-full max-w-xl flex-col gap-4">
        <div className="mb-1 flex items-center gap-2 text-sm text-white/30">
          <MapPin className="h-4 w-4" />
          <span>Top 3 Results</span>
        </div>
        <CompetitorCard rank={1} name={data.comp1_name} reviews={data.comp1_reviews} rating={data.comp1_rating} delay={0.3} />
        <CompetitorCard rank={2} name={data.comp2_name} reviews={data.comp2_reviews} rating={data.comp2_rating} delay={0.5} />
        <CompetitorCard rank={3} name={data.comp3_name} reviews={data.comp3_reviews} rating={data.comp3_rating} delay={0.7} />

        <div className="my-2 border-t border-dashed border-white/10" />
        <div className="text-center text-xs text-white/20">... positions 4-7 ...</div>

        <CompetitorCard
          rank={parseInt(data.prospect_rank.replace("#", ""))}
          name={data.prospect_name}
          reviews={data.prospect_reviews}
          rating={data.prospect_rating}
          isProspect
          delay={1.2}
        />
      </div>

      {/* pulse-red-border keyframe defined in index.css */}
    </SlideTransition>
  );
}
