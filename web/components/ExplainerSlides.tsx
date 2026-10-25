"use client";

import React, { useState } from "react";

interface ExplainerSlidesProps {
  onComplete: () => void;
  onBack?: () => void;
  onSkipToAuth?: () => void;
  onSkipToCockpit?: () => void;
}

export default function ExplainerSlides({
  onComplete,
  onBack,
  onSkipToAuth,
  onSkipToCockpit,
}: ExplainerSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState<0 | 1>(0);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(15, 29, 56, 0.5) 0%, rgba(11, 20, 36, 0.96) 80%)",
      }}
    >
      <div className="min-h-full flex flex-col justify-between p-4 sm:p-8 md:p-10 max-w-5xl mx-auto w-full">
        {/* Top Header: Stepper Header & Controls */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#C9A24B]/30 w-full gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-[#C9A24B] font-bold">
              {currentSlide === 0
                ? "STEP 2 OF 4 · THE CHALLENGE (WHAT IS HYDROMESH)"
                : "STEP 3 OF 4 · HOW IT OPERATES (5-AGENT DEFENSE)"}
            </span>
            <span className="text-[#A3B0C8]/40">|</span>
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#F0D27A]">
              <span>●</span>
              <span>●</span>
              <span className={currentSlide === 1 ? "text-[#F0D27A]" : "text-white/20"}>
                {currentSlide === 1 ? "●" : "○"}
              </span>
              <span className="text-white/20">○</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentSlide === 0 && onBack && (
              <button
                onClick={onBack}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] uppercase tracking-wider cursor-pointer transition-colors"
              >
                [← BACK TO WELCOME]
              </button>
            )}
            {currentSlide === 1 && (
              <button
                onClick={() => setCurrentSlide(0)}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] uppercase tracking-wider cursor-pointer transition-colors"
              >
                [← PREVIOUS: THE CHALLENGE]
              </button>
            )}
            {onSkipToCockpit && (
              <button
                onClick={onSkipToCockpit}
                className="text-xs font-mono text-[#D4AF37] hover:text-[#F0D27A] border border-[#C9A24B]/60 hover:border-[#F0D27A] px-3 py-1.5 rounded transition-colors cursor-pointer bg-[#10203D]/90 uppercase tracking-widest font-bold"
              >
                [ENTER COCKPIT DIRECTLY →]
              </button>
            )}
            <button
              onClick={onSkipToAuth || onComplete}
              className="text-xs font-mono text-[#A3B0C8] hover:text-[#C9A24B] uppercase tracking-widest cursor-pointer transition-colors"
            >
              [SKIP TO LOGIN]
            </button>
          </div>
        </div>

        {/* Center Content Stage */}
        <div className="relative z-10 w-full py-8 sm:py-10 flex-1 flex flex-col justify-center">
          {currentSlide === 0 ? (
            /* Slide 1: What is HydroMesh / The Challenge */
            <div className="space-y-6 sm:space-y-8 animate-fadeIn">
              <div>
                <div className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-[#C9A24B] font-semibold mb-2">
                  HIMALAYAN HYDROPOWER CHALLENGE
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F1EAD9] leading-tight">
                  Where Glacial Runoff Meets Sharp Mountain Quartz
                </h2>
              </div>

              <div className="p-4 sm:p-5 bg-[#0F1A2E]/80 border-l-2 border-[#C9A24B] rounded-r-sm">
                <p className="font-serif italic text-base sm:text-lg md:text-xl text-[#D9D2BF] leading-relaxed">
                  &quot;In steep Himalayan river basins, monsoon torrents carry abrasive quartz sand that destroys hardened turbine steel in fewer than 48 hours.&quot;
                </p>
              </div>

              {/* 3 Structured Obsidian-Glass Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
                <div className="bg-[#050A14]/80 border border-[#C9A24B]/30 hover:border-[#C9A24B]/60 p-5 rounded-sm transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F1EAD9]">
                        1,200+ PPM
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-[#C9A24B]/15 text-[#C9A24B] border border-[#C9A24B]/30 rounded">
                        MOHS 7 ABRASION
                      </span>
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#C9A24B] font-semibold mb-2">
                      Quartz Abrasion Point
                    </div>
                    <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                      Severe runner blade erosion begins, scouring bucket tips and splitter edges down to the hub.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-[#A3B0C8]/60">
                    Upper Tamakoshi baseline: 420 PPM
                  </div>
                </div>

                <div className="bg-[#050A14]/80 border border-[#C9A24B]/30 hover:border-[#C9A24B]/60 p-5 rounded-sm transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-[#E0705A]">
                        48 Hours
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-[#E0705A]/15 text-[#E0705A] border border-[#E0705A]/30 rounded">
                        FAILURE HORIZON
                      </span>
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#E0705A] font-semibold mb-2">
                      Unmonitored Failure
                    </div>
                    <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                      Turbine cavitation and severe vibration force emergency shutdown, causing millions in NPR losses.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-[#A3B0C8]/60">
                    Unplanned outage: NPR 28M/day
                  </div>
                </div>

                <div className="bg-[#050A14]/80 border border-[#C9A24B]/30 hover:border-[#C9A24B]/60 p-5 rounded-sm transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-[#5FB3A8]">
                        HydroMesh
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-[#5FB3A8]/15 text-[#5FB3A8] border border-[#5FB3A8]/30 rounded">
                        DEFENSE KERNEL
                      </span>
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#5FB3A8] font-semibold mb-2">
                      Autonomous Defense
                    </div>
                    <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                      Predicts quartz pulses hours in advance using live NASA weather and modulates intake gates safely.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-[#A3B0C8]/60">
                    Lead time: 4-6 hours before silt pulse
                  </div>
                </div>
              </div>

              {/* Triple-Pillar Real-World Value & Impact Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-left">
                <div className="bg-[#050A14]/70 border border-[#5FB3A8]/25 px-3 py-2.5 rounded-sm text-[11px] font-mono text-[#A3B0C8] flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5FB3A8] flex-shrink-0" />
                  <span><strong className="text-[#F1EAD9]">Flood Safety:</strong> 4-6h early GLOF alerts for river valley communities</span>
                </div>
                <div className="bg-[#050A14]/70 border border-[#C9A24B]/25 px-3 py-2.5 rounded-sm text-[11px] font-mono text-[#A3B0C8] flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A24B] flex-shrink-0" />
                  <span><strong className="text-[#F1EAD9]">Steel Defense:</strong> Stops Mohs 7 quartz runner scouring</span>
                </div>
                <div className="bg-[#050A14]/70 border border-[#F0D27A]/25 px-3 py-2.5 rounded-sm text-[11px] font-mono text-[#A3B0C8] flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0D27A] flex-shrink-0" />
                  <span><strong className="text-[#F1EAD9]">Financial & Stock:</strong> PPA margin defense and NEPSE equity risk advisory</span>
                </div>
              </div>
            </div>
          ) : (
            /* Slide 2: How It Operates */
            <div className="space-y-6 sm:space-y-8 animate-fadeIn">
              <div>
                <div className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-[#C9A24B] font-semibold mb-2">
                  SAFETY-BOUNDED DEFENSE PIPELINE
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F1EAD9] leading-tight">
                  Five Autonomous Agents. One Deterministic Safety Kernel.
                </h2>
              </div>

              <div className="p-4 sm:p-5 bg-[#0F1A2E]/80 border-l-2 border-[#5FB3A8] rounded-r-sm">
                <p className="font-serif italic text-base sm:text-lg md:text-xl text-[#D9D2BF] leading-relaxed">
                  &quot;The neural models propose. The deterministic safety kernel bounds. The plant operator acknowledges.&quot;
                </p>
              </div>

              {/* 3 Structured Obsidian-Glass Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
                <div className="bg-[#050A14]/80 border border-[#C9A24B]/30 hover:border-[#C9A24B]/60 p-5 rounded-sm transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F1EAD9]">
                        SHA-256 SOPs
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-[#C9A24B]/15 text-[#C9A24B] border border-[#C9A24B]/30 rounded">
                        CRYPTOGRAPHIC MEMORY
                      </span>
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#C9A24B] font-semibold mb-2">
                      Deterministic Standards
                    </div>
                    <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                      Matches river telemetry directly against tamper-proof, verified station operating procedures.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-[#A3B0C8]/60">
                    Zero hallucination · Verified SHA-256 hash
                  </div>
                </div>

                <div className="bg-[#050A14]/80 border border-[#C9A24B]/30 hover:border-[#C9A24B]/60 p-5 rounded-sm transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-[#5FB3A8]">
                        Allievi Clamp
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-[#5FB3A8]/15 text-[#5FB3A8] border border-[#5FB3A8]/30 rounded">
                        PHYSICS BOUND
                      </span>
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#5FB3A8] font-semibold mb-2">
                      Surge Wave Physics
                    </div>
                    <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                      Rule R3 clamps gate drop rate to prevent catastrophic penstock water hammer and pressure spikes.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-[#A3B0C8]/60">
                    Surge clamp: Max 1.2 m/s closure rate
                  </div>
                </div>

                <div className="bg-[#050A14]/80 border border-[#C9A24B]/30 hover:border-[#C9A24B]/60 p-5 rounded-sm transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F0D27A]">
                        Plain English
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-[#F0D27A]/15 text-[#0B1424] font-bold border border-[#F0D27A]/40 rounded">
                        &lt;12MS INFERENCE
                      </span>
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#F0D27A] font-semibold mb-2">
                      Grade-1 Explanation
                    </div>
                    <p className="text-xs text-[#A3B0C8] font-sans leading-relaxed">
                      Translates mathematical matrices into clear operator instructions in under 12 milliseconds.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-[#A3B0C8]/60">
                    Targeted operator action within 10-min window
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#C9A24B]/30 w-full gap-4 flex-wrap mt-4">
          <div>
            {currentSlide === 0 ? (
              onBack && (
                <button
                  onClick={onBack}
                  className="text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] uppercase tracking-wider cursor-pointer transition-colors"
                >
                  [← BACK TO WELCOME]
                </button>
              )
            ) : (
              <button
                onClick={() => setCurrentSlide(0)}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] uppercase tracking-wider cursor-pointer transition-colors"
              >
                [← PREVIOUS: THE CHALLENGE]
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {currentSlide === 0 ? (
              <button
                onClick={() => setCurrentSlide(1)}
                className="px-6 py-2.5 bg-gradient-to-r from-[#C9A24B] to-[#F0D27A] hover:brightness-110 text-[#0B1424] font-serif font-bold text-xs uppercase tracking-widest rounded-sm transition-all shadow-[0_2px_8px_rgba(201,162,75,0.4)] cursor-pointer"
              >
                NEXT: HOW IT OPERATES (STEP 3/4) →
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="px-6 py-2.5 bg-gradient-to-r from-[#C9A24B] to-[#F0D27A] hover:brightness-110 text-[#0B1424] font-serif font-bold text-xs uppercase tracking-widest rounded-sm transition-all shadow-[0_2px_8px_rgba(201,162,75,0.4)] cursor-pointer"
              >
                PROCEED TO OPERATOR AUTH (STEP 4/4) →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
