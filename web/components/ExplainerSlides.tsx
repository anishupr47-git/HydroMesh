"use client";

import React, { useState } from "react";
import ChakraBackground from "./ChakraBackground";

interface ExplainerSlidesProps {
  onComplete: () => void;
}

export default function ExplainerSlides({ onComplete }: ExplainerSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState<0 | 1>(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0B1424] overflow-y-auto"
      style={{
        backgroundColor: "#0B1424",
      }}
    >
      {/* Background Rotating Chakra */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="relative"
          style={{
            transform: "scale(1.2)",
            opacity: 0.18,
          }}
        >
          <ChakraBackground size={980} />
        </div>
      </div>

      {/* Atmospheric vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(15, 29, 56, 0.45) 0%, rgba(11, 20, 36, 0.96) 85%)",
        }}
      />

      {/* Main Explainer Card Container */}
      <div className="relative z-10 w-full max-w-4xl bg-[#0F1A2E] border border-[#C9A24B] shadow-2xl pn p-6 sm:p-10 my-auto">
        {/* Perched Roman Badge */}
        <div className="np">
          {currentSlide === 0 ? "SLIDE I · THE HIMALAYAN CRISIS" : "SLIDE II · AUTONOMOUS DEFENSE"}
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-[#C9A24B]/30 mb-6 mt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9A24B] shadow-[0_0_8px_#C9A24B]" />
            <span className="text-xs font-mono uppercase tracking-[0.16em] text-[#A3B0C8]">
              Mission Briefing · Phase 2 of 4
            </span>
          </div>

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentSlide(0)}
              className={`w-8 h-2 rounded-sm transition-all duration-300 ${
                currentSlide === 0
                  ? "bg-[#C9A24B] shadow-[0_0_8px_#C9A24B]"
                  : "bg-[#13264A] hover:bg-[#C9A24B]/50"
              }`}
              title="Slide 1"
            />
            <button
              onClick={() => setCurrentSlide(1)}
              className={`w-8 h-2 rounded-sm transition-all duration-300 ${
                currentSlide === 1
                  ? "bg-[#C9A24B] shadow-[0_0_8px_#C9A24B]"
                  : "bg-[#13264A] hover:bg-[#C9A24B]/50"
              }`}
              title="Slide 2"
            />
            <button
              onClick={onComplete}
              className="text-xs font-mono text-[#A3B0C8] hover:text-[#F0D27A] ml-3 transition-colors cursor-pointer"
            >
              Skip →
            </button>
          </div>
        </div>

        {/* Slide 1: The Crisis in the Himalayas */}
        {currentSlide === 0 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#C9A24B] mb-2">
                Himalayan Run-of-River Physical Reality
              </p>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#F1EAD9] leading-tight">
                Where Glacial Runoff Meets Sharp Mountain Quartz
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="text-2xl font-serif font-bold text-[#E0A43A] mb-1">
                  1,200+ PPM
                </div>
                <div className="text-xs font-mono text-[#A3B0C8] uppercase tracking-wider mb-2">
                  Quartz Abrasion Point
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  Monsoon cloudbursts wash massive quartz sand deposits into mountain headponds.
                  Grains exceeding 1,200 PPM scour hardened steel runner blades down to the hub.
                </p>
              </div>

              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="text-2xl font-serif font-bold text-[#E0705A] mb-1">
                  &lt; 48 Hours
                </div>
                <div className="text-xs font-mono text-[#A3B0C8] uppercase tracking-wider mb-2">
                  Structural Cavitation
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  Unmonitored high-sediment pulses induce catastrophic runner erosion within two
                  days, resulting in unplanned plant shutdown and millions in repair downtime.
                </p>
              </div>

              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="text-2xl font-serif font-bold text-[#5FB3A8] mb-1">
                  First-Ever
                </div>
                <div className="text-xs font-mono text-[#A3B0C8] uppercase tracking-wider mb-2">
                  Autonomous Guardian
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  HydroMesh combines deep physics, live satellite precipitation telemetry, and
                  cryptographic safety verification to guard Himalayan hydropower assets in real time.
                </p>
              </div>
            </div>

            <div className="bg-[#0B1424]/70 border-l-2 border-[#C9A24B] p-4 text-xs font-sans text-[#D9D2BF] leading-relaxed">
              <strong className="text-[#F1EAD9] font-serif tracking-wide block mb-1">
                The Himalayan Engineering Challenge:
              </strong>
              The Himalayas are the youngest and highest-gradient mountain range on Earth. Run-of-river
              plants cannot rely on massive storage reservoirs; they must continuously harmonize
              energy generation targets against violent sediment fluxes while maintaining penstock
              hydraulic safety.
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#C9A24B]/30">
              <span className="text-xs font-mono text-[#A3B0C8]">1 of 2 briefings</span>
              <button
                onClick={() => setCurrentSlide(1)}
                className="px-6 py-2.5 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-semibold text-sm tracking-wide rounded-sm transition-all shadow-[0_2px_12px_rgba(201,162,75,0.35)] cursor-pointer"
              >
                Next Briefing: Autonomous Defense →
              </button>
            </div>
          </div>
        )}

        {/* Slide 2: Autonomous Defense: 5 Agents & Safety Kernel */}
        {currentSlide === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#C9A24B] mb-2">
                Five-Agent Collaborative Pipeline
              </p>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#F1EAD9] leading-tight">
                The AI Proposes. The Safety Kernel Bounds. The Operator Decides.
              </h2>
            </div>

            {/* 4 Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-serif font-bold px-2 py-0.5 bg-[#C9A24B]/20 text-[#F0D27A] border border-[#C9A24B]/40">
                    01
                  </span>
                  <span className="text-xs font-mono uppercase text-[#F1EAD9] tracking-wider">
                    Satellite Predictive Window
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  Fusing NASA GPM IMERG 1-second rainfall telemetry and ECMWF 9km moisture flux to
                  detect monsoon cloudbursts up to 4 hours before floodwaters impact intake gates.
                </p>
              </div>

              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-serif font-bold px-2 py-0.5 bg-[#C9A24B]/20 text-[#F0D27A] border border-[#C9A24B]/40">
                    02
                  </span>
                  <span className="text-xs font-mono uppercase text-[#F1EAD9] tracking-wider">
                    Cryptographic SOP Verification
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  Matching live river anomalies against SHA-256 authenticated standard operating
                  procedures (SOP-04 Desander Flushing, SOP-09 Emergency Turbine Shutoff).
                </p>
              </div>

              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-serif font-bold px-2 py-0.5 bg-[#C9A24B]/20 text-[#F0D27A] border border-[#C9A24B]/40">
                    03
                  </span>
                  <span className="text-xs font-mono uppercase text-[#F1EAD9] tracking-wider">
                    Rigorous Hydraulic Physics
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  Allievi water hammer surge clamping to prevent penstock rupture and IEC 62364
                  quartz abrasion minimization, hard-enforced by deterministic safety rules (R1–R11).
                </p>
              </div>

              <div className="bg-[#13264A]/60 border border-[#C9A24B]/30 p-4 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-serif font-bold px-2 py-0.5 bg-[#C9A24B]/20 text-[#F0D27A] border border-[#C9A24B]/40">
                    04
                  </span>
                  <span className="text-xs font-mono uppercase text-[#F1EAD9] tracking-wider">
                    Grade-1 Plain English
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] leading-relaxed">
                  Converting complex non-linear hydraulic matrices into crystal-clear natural
                  language explanations so control room engineers can act with complete clarity.
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#C9A24B]/30">
              <button
                onClick={() => setCurrentSlide(0)}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#F0D27A] transition-colors cursor-pointer"
              >
                ← Back to Slide 1
              </button>
              <button
                onClick={onComplete}
                className="px-8 py-3 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-bold text-sm tracking-widest uppercase rounded-sm transition-all shadow-[0_0_20px_rgba(201,162,75,0.45)] cursor-pointer"
              >
                ENTER THE CONTROL ROOM →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
