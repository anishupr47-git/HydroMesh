"use client";

import React, { useEffect, useState } from "react";

interface CinematicIntroProps {
  onComplete: () => void;
  onSkipToAuth?: () => void;
}

// Letter definitions for sequential rain drop
const WORD_WELCOME = ["W", "E", "L", "C", "O", "M", "E"];
const WORD_TO = ["T", "O"];
const WORD_HYDROMESH = ["H", "Y", "D", "R", "O", "M", "E", "S", "H"];

export default function CinematicIntro({
  onComplete,
  onSkipToAuth,
}: CinematicIntroProps) {
  // Current letter index that has started falling
  const [droppedCount, setDroppedCount] = useState<number>(0);
  // Track landed letters (to show baseline ripple and lock into datum line)
  const [landedSet, setLandedSet] = useState<Set<number>>(new Set());
  // Complete assembly state
  const [isAssembled, setIsAssembled] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const totalLetters =
    WORD_WELCOME.length + WORD_TO.length + WORD_HYDROMESH.length;

  useEffect(() => {
    // 1. Initial 250ms pause
    const startTimer = setTimeout(() => {
      let currentIdx = 0;
      const dropInterval = setInterval(() => {
        currentIdx++;
        setDroppedCount(currentIdx);

        const letterIdx = currentIdx - 1;
        setTimeout(() => {
          setLandedSet((prev) => new Set(prev).add(letterIdx));
        }, 280);

        if (currentIdx >= totalLetters) {
          clearInterval(dropInterval);
          setTimeout(() => {
            setIsAssembled(true);
          }, 320);

          // Auto-advance after reading time (3.5s after assembly)
          const autoAdvanceTimer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
              onComplete();
            }, 600);
          }, 3500);

          return () => clearTimeout(autoAdvanceTimer);
        }
      }, 70); // 70ms cadence for snappy, graceful rain

      return () => clearInterval(dropInterval);
    }, 250);

    return () => clearTimeout(startTimer);
  }, [onComplete, totalLetters]);

  const handleProceed = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(15, 29, 56, 0.45) 0%, rgba(11, 20, 36, 0.96) 80%)",
      }}
    >
      <div className="min-h-full flex flex-col justify-between p-4 sm:p-8 md:p-10 max-w-5xl mx-auto w-full">
        {/* Top Header: Stepper & Quick Actions */}
        <div className="relative z-30 flex items-center justify-between pb-4 border-b border-[#C9A24B]/30 w-full gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#C9A24B] font-bold">
              STEP 1 OF 4 · WELCOME
            </span>
            <span className="text-[#A3B0C8]/40">|</span>
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#F0D27A]">
              <span>●</span>
              <span className="text-white/20">○</span>
              <span className="text-white/20">○</span>
              <span className="text-white/20">○</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onSkipToAuth && (
              <button
                onClick={onSkipToAuth}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#C9A24B] uppercase tracking-widest cursor-pointer transition-colors"
              >
                [SKIP TO LOGIN]
              </button>
            )}
            <button
              onClick={handleProceed}
              className="text-xs font-mono text-[#F1EAD9] hover:text-[#C9A24B] border border-[#C9A24B]/40 hover:border-[#C9A24B] px-3 py-1.5 rounded transition-colors cursor-pointer bg-[#0F1A2E]/80 uppercase tracking-widest"
            >
              [PROCEED TO BRIEFING →]
            </button>
          </div>
        </div>

        {/* Center Rain Catchment Stage */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-2 sm:px-4 py-8 sm:py-12">
        {/* Subtle Pre-Drop Subtitle */}
        <div
          className={`text-[11px] sm:text-xs font-mono uppercase tracking-[0.3em] text-[#C9A24B] mb-6 sm:mb-8 transition-opacity duration-700 font-semibold ${
            droppedCount > 0 ? "opacity-90" : "opacity-0"
          }`}
        >
          Himalayan Hydropower Autonomous Guardian
        </div>

        {/* Rain of Letters Grid: Organized into 2 balanced rows so it NEVER breaks or splits awkwardly */}
        <div className="space-y-4 sm:space-y-6">
          {/* Row 1: "WELCOME TO" */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {/* Word: WELCOME */}
            <div className="flex items-center">
              {WORD_WELCOME.map((char, i) => {
                const globalIdx = i;
                const hasStarted = droppedCount > globalIdx;
                const hasLanded = landedSet.has(globalIdx);

                return (
                  <div
                    key={`w0-${i}`}
                    className="relative flex flex-col items-center justify-end px-0.5 sm:px-1 w-7 sm:w-12 md:w-14 h-14 sm:h-20"
                  >
                    <span
                      className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold select-none"
                      style={{
                        visibility: hasStarted ? "visible" : "hidden",
                        opacity: hasStarted ? 1 : 0,
                        transform: hasStarted ? "translateY(0)" : "translateY(-40px)",
                        transition: "transform 0.28s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.28s ease",
                        textShadow: hasLanded
                          ? "0 0 20px rgba(201, 162, 75, 0.5), 0 2px 8px rgba(0,0,0,0.8)"
                          : "none",
                        color: hasLanded ? "#F1EAD9" : "#C9A24B",
                      }}
                    >
                      {char}
                    </span>
                    {hasLanded && (
                      <div className="absolute bottom-0 w-6 sm:w-8 h-0.5 bg-[#C9A24B]/60 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Word: TO */}
            <div className="flex items-center">
              {WORD_TO.map((char, i) => {
                const globalIdx = WORD_WELCOME.length + i;
                const hasStarted = droppedCount > globalIdx;
                const hasLanded = landedSet.has(globalIdx);

                return (
                  <div
                    key={`w1-${i}`}
                    className="relative flex flex-col items-center justify-end px-0.5 sm:px-1 w-7 sm:w-12 md:w-14 h-14 sm:h-20"
                  >
                    <span
                      className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold select-none"
                      style={{
                        visibility: hasStarted ? "visible" : "hidden",
                        opacity: hasStarted ? 1 : 0,
                        transform: hasStarted ? "translateY(0)" : "translateY(-40px)",
                        transition: "transform 0.28s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.28s ease",
                        textShadow: hasLanded
                          ? "0 0 20px rgba(201, 162, 75, 0.5), 0 2px 8px rgba(0,0,0,0.8)"
                          : "none",
                        color: hasLanded ? "#F1EAD9" : "#C9A24B",
                      }}
                    >
                      {char}
                    </span>
                    {hasLanded && (
                      <div className="absolute bottom-0 w-6 sm:w-8 h-0.5 bg-[#C9A24B]/60 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2: "HYDROMESH" */}
          <div className="flex items-center justify-center">
            {WORD_HYDROMESH.map((char, i) => {
              const globalIdx = WORD_WELCOME.length + WORD_TO.length + i;
              const hasStarted = droppedCount > globalIdx;
              const hasLanded = landedSet.has(globalIdx);

              return (
                <div
                  key={`w2-${i}`}
                  className="relative flex flex-col items-center justify-end px-0.5 sm:px-1 w-7 sm:w-12 md:w-14 h-14 sm:h-20"
                >
                  <span
                    className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold select-none"
                    style={{
                      visibility: hasStarted ? "visible" : "hidden",
                      opacity: hasStarted ? 1 : 0,
                      transform: hasStarted ? "translateY(0)" : "translateY(-40px)",
                      transition: "transform 0.28s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.28s ease",
                      textShadow: hasLanded
                        ? "0 0 24px rgba(240, 210, 122, 0.6), 0 2px 8px rgba(0,0,0,0.8)"
                        : "none",
                      color: hasLanded
                        ? i >= 5
                          ? "#F0D27A"
                          : "#F1EAD9"
                        : "#C9A24B",
                    }}
                  >
                    {char}
                  </span>
                  {hasLanded && (
                    <div className="absolute bottom-0 w-6 sm:w-8 h-0.5 bg-[#F0D27A]/70 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Golden Horizontal Datum Line */}
        <div className="relative w-full max-w-xl h-[1px] bg-[#C9A24B]/30 mt-6 overflow-hidden mx-auto">
          {isAssembled && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F0D27A] to-transparent animate-pulse"
              style={{ animationDuration: "1.2s" }}
            />
          )}
        </div>

        {/* Status indicator once assembled & Proceed Button */}
        <div
          className={`mt-6 space-y-4 transition-all duration-500 ${
            isAssembled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="font-mono text-xs uppercase tracking-widest text-[#A3B0C8]">
            [REAL-TIME NEURAL SENSING PIPELINE ONLINE]
          </div>

          <div>
            <button
              onClick={handleProceed}
              className="px-8 py-3 bg-gradient-to-r from-[#C9A24B] to-[#F0D27A] hover:brightness-110 text-[#0B1424] font-serif font-bold text-xs uppercase tracking-[0.2em] rounded shadow-[0_2px_14px_rgba(201,162,75,0.4)] transition-all cursor-pointer"
            >
              PROCEED TO 2-PAGE BRIEFING →
            </button>
          </div>
        </div>
      </div>

        {/* Bottom Footer Subtext */}
        <div className="relative z-30 flex items-center justify-between pt-4 border-t border-[#C9A24B]/20 w-full text-xs font-mono text-[#A3B0C8]/60">
          <span>HydroMesh SCADA OS v2.4</span>
          <span>Himalayan Basin Defense · 20 Station Matrix</span>
        </div>
      </div>
    </div>
  );
}
