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
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(15, 29, 56, 0.5) 0%, rgba(11, 20, 36, 0.95) 80%)",
      }}
    >

      {/* Top Header: Simple Breadcrumb & Skip */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#C9A24B]/30 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-[#C9A24B]">
            {currentSlide === 0 ? "PART 1 · WHAT IS HYDROMESH" : "PART 2 · HOW IT OPERATES"}
          </span>
          <span className="text-[#A3B0C8]/40">|</span>
          <span className="text-xs font-mono text-[#A3B0C8] uppercase tracking-wider">
            {currentSlide + 1} OF 2
          </span>
        </div>

        <button
          onClick={onComplete}
          className="text-xs font-mono text-[#A3B0C8] hover:text-[#C9A24B] uppercase tracking-widest cursor-pointer transition-colors"
        >
          [SKIP TO AUTH]
        </button>
      </div>

      {/* Center Content: Clean Typography Sticking to Root Background */}
      <div className="relative z-10 max-w-4xl mx-auto w-full my-auto py-8">
        {currentSlide === 0 ? (
          /* Slide 1: What is HydroMesh */
          <div className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#C9A24B]">
              Himalayan Hydropower Challenge
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F1EAD9] leading-tight">
              Where Glacial Runoff Meets Sharp Mountain Quartz
            </h2>

            <p className="font-serif italic text-xl sm:text-2xl text-[#D9D2BF] leading-relaxed">
              &quot;In the steep Himalayan river basins, monsoon torrents carry abrasive quartz sand that destroys hardened turbine steel in fewer than 48 hours.&quot;
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#C9A24B]/20">
              <div className="space-y-2">
                <div className="text-2xl font-serif font-bold text-[#F1EAD9]">
                  1,200+ PPM
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                  Quartz Abrasion Point
                </div>
                <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                  Severe runner blade erosion begins, scouring bucket tips and splitter edges down to the hub.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-2xl font-serif font-bold text-[#F1EAD9]">
                  48 Hours
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                  Unmonitored Failure
                </div>
                <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                  Turbine cavitation and severe vibration force emergency shutdown, causing millions in NPR losses.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-2xl font-serif font-bold text-[#F1EAD9]">
                  HydroMesh
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                  Autonomous Defense
                </div>
                <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                  Predicts quartz pulses hours in advance using live NASA satellite weather and controls intake gates safely.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Slide 2: How It Operates */
          <div className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#C9A24B]">
              Safety-Bounded Pipeline
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#F1EAD9] leading-tight">
              Five Autonomous Agents. One Deterministic Safety Kernel.
            </h2>

            <p className="font-serif italic text-xl sm:text-2xl text-[#D9D2BF] leading-relaxed">
              &quot;The neural models propose. The deterministic safety kernel bounds. The plant operator acknowledges.&quot;
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#C9A24B]/20">
              <div className="space-y-2">
                <div className="text-2xl font-serif font-bold text-[#F1EAD9]">
                  SHA-256 SOPs
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                  Cryptographic Memory
                </div>
                <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                  Matches river telemetry directly against tamper-proof, verified station operating procedures.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-2xl font-serif font-bold text-[#F1EAD9]">
                  Allievi Clamp
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                  Surge Wave Physics
                </div>
                <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                  Rule R3 clamps gate drop rate to prevent catastrophic penstock water hammer and pressure spikes.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-2xl font-serif font-bold text-[#F1EAD9]">
                  Plain English
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                  Grade-1 Explanation
                </div>
                <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                  Translates mathematical matrices into clear operator instructions in under 12 milliseconds.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#C9A24B]/30 max-w-4xl mx-auto w-full">
        <div>
          {currentSlide === 1 && (
            <button
              onClick={() => setCurrentSlide(0)}
              className="text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] uppercase tracking-wider cursor-pointer"
            >
              [← PREVIOUS]
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {currentSlide === 0 ? (
            <button
              onClick={() => setCurrentSlide(1)}
              className="px-6 py-2.5 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-bold text-xs uppercase tracking-widest rounded-sm transition-all shadow-[0_2px_8px_rgba(201,162,75,0.4)] cursor-pointer"
            >
              HOW IT WORKS →
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-bold text-xs uppercase tracking-widest rounded-sm transition-all shadow-[0_2px_8px_rgba(201,162,75,0.4)] cursor-pointer"
            >
              PROCEED TO OPERATOR AUTH →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
