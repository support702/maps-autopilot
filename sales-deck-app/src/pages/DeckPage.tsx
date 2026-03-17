import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import type { AuditData } from "../data/sampleData";
import { sampleData } from "../data/sampleData";
import { ProgressBar } from "../components/ProgressBar";
import { Slide01Hook } from "../slides/Slide01Hook";
import { Slide02MapsPack } from "../slides/Slide02MapsPack";
import { Slide03MoneyMath } from "../slides/Slide03MoneyMath";
import { Slide03BKeywordGap } from "../slides/Slide03BKeywordGap";
import { Slide04Phase1 } from "../slides/Slide04Phase1";
import { Slide05Phase2 } from "../slides/Slide05Phase2";
import { Slide06Proof } from "../slides/Slide06Proof";
import { Slide07Guarantee } from "../slides/Slide07Guarantee";
import { Slide08Territory } from "../slides/Slide08Territory";
import { Slide09A } from "../slides/Slide09A";
import { Slide09B } from "../slides/Slide09B";
import { Slide10NextDays } from "../slides/Slide10NextDays";
import { Slide11End } from "../slides/Slide11End";

const TOTAL_SLIDES = 13;

export function DeckPage() {
  const { auditId } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AuditData>(sampleData);
  const [_loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auditId) return;
    setLoading(true);
    fetch(`/audits/${auditId}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((auditData: AuditData) => setData(auditData))
      .catch(() => console.warn(`Audit ${auditId} not found, using sample data`))
      .finally(() => setLoading(false));
  }, [auditId]);

  const track = searchParams.get("track") || data.track || "aggressive";

  const [currentSlide, setCurrentSlide] = useState(0);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  function renderSlide() {
    switch (currentSlide) {
      case 0: return <Slide01Hook data={data} />;
      case 1: return <Slide02MapsPack data={data} />;
      case 2: return <Slide03MoneyMath data={data} />;
      case 3: return <Slide03BKeywordGap data={data} />;
      case 4: return <Slide04Phase1 />;
      case 5: return <Slide05Phase2 />;
      case 6: return <Slide06Proof data={data} />;
      case 7: return <Slide07Guarantee track={track} />;
      case 8: return <Slide08Territory data={data} />;
      case 9: return <Slide09A data={data} />;
      case 10: return <Slide09B data={data} />;
      case 11: return <Slide10NextDays />;
      case 12: return <Slide11End data={data} />;
      default: return <Slide01Hook data={data} />;
    }
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-[#0A0A0B] to-[#1A1A2E]"
    >
      {/* Dot grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />
      {/* Drifting mesh gradients */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          animation: "mesh-drift 60s ease-in-out infinite",
          background: "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(15, 157, 154, 0.03), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          animation: "mesh-drift 60s ease-in-out infinite reverse",
          background: "radial-gradient(ellipse 70% 50% at 70% 60%, rgba(230, 57, 70, 0.02), transparent 70%)",
        }}
      />
      {/* Noise/grain overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      {/* Click zones for navigation */}
      <div
        className="no-print absolute left-0 top-0 z-40 h-full w-1/4 cursor-pointer"
        onClick={goPrev}
        aria-label="Previous slide"
      />
      <div
        className="no-print absolute right-0 top-0 z-40 h-full w-1/4 cursor-pointer"
        onClick={goNext}
        aria-label="Next slide"
      />

      <AnimatePresence mode="wait">
        <div key={currentSlide} className="h-full w-full">
          {renderSlide()}
        </div>
      </AnimatePresence>

      <ProgressBar current={currentSlide} total={TOTAL_SLIDES} />
    </div>
  );
}
