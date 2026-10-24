"use client";

import React, { useEffect, useState } from "react";

interface CinematicIntroProps {
  onComplete: () => void;
}

// Letter definitions for sequential rain drop
const WORD_WELCOME = ["W", "E", "L", "C", "O", "M", "E"];
const WORD_TO = ["T", "O"];
const WORD_HYDROMESH = ["H", "Y", "D", "R", "O", "M", "E", "S", "H"];

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  // Current letter index that has started falling (0 means none dropped yet)
  const [droppedCount, setDroppedCount] = useState<number>(0);
  // Track landed letters (to show baseline ripple and lock into datum line)
  const [landedSet, setLandedSet] = useState<Set<number>>(new Set());
  // Complete assembly state
  const [isAssembled, setIsAssembled] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const totalLetters =
    WORD_WELCOME.length + WORD_TO.length + WORD_HYDROMESH.length;

  useEffect(() => {
    // 1. Initial 300ms pause with just rotating chakra in plain root background
    const startTimer = setTimeout(() => {
      // 2. Drop letters one by one sequentially like raindrops from above the viewport
      let currentIdx = 0;
      const dropInterval = setInterval(() => {
        currentIdx++;
        setDroppedCount(currentIdx);

        // Mark as landed 360ms after drop starts
        const letterIdx = currentIdx - 1;
        setTimeout(() => {
          setLandedSet((prev) => new Set(prev).add(letterIdx));
        }, 360);

        if (currentIdx >= totalLetters) {
          clearInterval(dropInterval);
          // 3. All letters assembled -> trigger golden horizon datum sweep
          setTimeout(() => {
            setIsAssembled(true);
          }, 420);

          // 4. Fade out intro and transition to next step
          setTimeout(() => {
            setIsFadingOut(true);
          }, 2400);

          setTimeout(() => {
            onComplete();
          }, 3100);
        }
      }, 130); // 130ms cadence between raindrops

      return () => clearInterval(dropInterval);
    }, 350);

    return () => clearTimeout(startTimer);
  }, [onComplete, totalLetters]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(15, 29, 56, 0.4) 0%, rgba(11, 20, 36, 0.94) 75%)",
      }}
    >
      {/* Top Right Quick Skip Button */}
      <div className="absolute top-6 right-8 z-30">
        <button
          onClick={onComplete}
          className="text-xs font-mono text-[#A3B0C8] hover:text-[#C9A24B] border border-[#C9A24B]/30 hover:border-[#C9A24B] px-3 py-1.5 rounded-sm transition-colors cursor-pointer bg-[#0F1A2E]/80 uppercase tracking-widest"
        >
          [SKIP INTRO]
        </button>
      </div>

      {/* Center Rain Catchment Stage */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 max-w-4xl">
        {/* Subtle Pre-Drop Subtitle */}
        <div
          className={`text-[11px] font-mono uppercase tracking-[0.3em] text-[#C9A24B] mb-8 transition-opacity duration-700 ${
            droppedCount > 0 ? "opacity-80" : "opacity-0"
          }`}
        >
          Himalayan Hydropower Autonomous Guardian
        </div>

        {/* Rain of Letters Grid: "WELCOME" "TO" "HYDROMESH" */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-3">
          {/* Word 1: WELCOME */}
          <div className="flex items-center">
            {WORD_WELCOME.map((char, i) => {
              const globalIdx = i;
              const hasStarted = droppedCount > globalIdx;
              const hasLanded = landedSet.has(globalIdx);

              return (
                <div
                  key={`w0-${i}`}
                  className="relative flex flex-col items-center justify-end px-1 sm:px-1.5"
                  style={{ minWidth: "24px", height: "80px" }}
                >
                  {/* The Rain Letter: Hidden above until its exact turn arrives */}
                  <span
                    className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold select-none"
                    style={{
                      visibility: hasStarted ? "visible" : "hidden",
                      opacity: hasStarted ? 1 : 0,
                      animation: hasStarted
                        ? "letter-rain 0.42s cubic-bezier(0.22, 0.61, 0.36, 1) forwards"
                        : "none",
                      textShadow: hasLanded
                        ? "0 0 20px rgba(201, 162, 75, 0.5), 0 2px 8px rgba(0,0,0,0.8)"
                        : "none",
                      color: hasLanded ? "#F1EAD9" : "#C9A24B",
                      transition: "text-shadow 0.3s ease, color 0.3s ease",
                    }}
                  >
                    {char}
                  </span>

                  {/* Water splash ripple when letter lands */}
                  {hasLanded && (
                    <div
                      className="absolute bottom-0 w-8 h-1 bg-[#C9A24B]/70 rounded-full animate-ping pointer-events-none"
                      style={{
                        animationDuration: "0.55s",
                        animationIterationCount: 1,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Word 2: TO */}
          <div className="flex items-center">
            {WORD_TO.map((char, i) => {
              const globalIdx = WORD_WELCOME.length + i;
              const hasStarted = droppedCount > globalIdx;
              const hasLanded = landedSet.has(globalIdx);

              return (
                <div
                  key={`w1-${i}`}
                  className="relative flex flex-col items-center justify-end px-1 sm:px-1.5"
                  style={{ minWidth: "24px", height: "80px" }}
                >
                  <span
                    className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold select-none"
                    style={{
                      visibility: hasStarted ? "visible" : "hidden",
                      opacity: hasStarted ? 1 : 0,
                      animation: hasStarted
                        ? "letter-rain 0.42s cubic-bezier(0.22, 0.61, 0.36, 1) forwards"
                        : "none",
                      textShadow: hasLanded
                        ? "0 0 20px rgba(201, 162, 75, 0.5), 0 2px 8px rgba(0,0,0,0.8)"
                        : "none",
                      color: hasLanded ? "#F1EAD9" : "#C9A24B",
                      transition: "text-shadow 0.3s ease, color 0.3s ease",
                    }}
                  >
                    {char}
                  </span>

                  {hasLanded && (
                    <div
                      className="absolute bottom-0 w-8 h-1 bg-[#C9A24B]/70 rounded-full animate-ping pointer-events-none"
                      style={{
                        animationDuration: "0.55s",
                        animationIterationCount: 1,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Word 3: HYDROMESH */}
          <div className="flex items-center">
            {WORD_HYDROMESH.map((char, i) => {
              const globalIdx = WORD_WELCOME.length + WORD_TO.length + i;
              const hasStarted = droppedCount > globalIdx;
              const hasLanded = landedSet.has(globalIdx);

              return (
                <div
                  key={`w2-${i}`}
                  className="relative flex flex-col items-center justify-end px-1 sm:px-1.5"
                  style={{ minWidth: "24px", height: "80px" }}
                >
                  <span
                    className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold select-none"
                    style={{
                      visibility: hasStarted ? "visible" : "hidden",
                      opacity: hasStarted ? 1 : 0,
                      animation: hasStarted
                        ? "letter-rain 0.42s cubic-bezier(0.22, 0.61, 0.36, 1) forwards"
                        : "none",
                      textShadow: hasLanded
                        ? "0 0 24px rgba(240, 210, 122, 0.6), 0 2px 8px rgba(0,0,0,0.8)"
                        : "none",
                      color: hasLanded
                        ? i >= 5
                          ? "#F0D27A"
                          : "#F1EAD9"
                        : "#C9A24B",
                      transition: "text-shadow 0.3s ease, color 0.3s ease",
                    }}
                  >
                    {char}
                  </span>

                  {hasLanded && (
                    <div
                      className="absolute bottom-0 w-8 h-1 bg-[#F0D27A]/70 rounded-full animate-ping pointer-events-none"
                      style={{
                        animationDuration: "0.55s",
                        animationIterationCount: 1,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Golden Horizontal Datum Line that lights up once all letters seat */}
        <div className="relative w-full max-w-xl h-[1px] bg-[#C9A24B]/30 mt-5 overflow-hidden">
          {isAssembled && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F0D27A] to-transparent animate-pulse"
              style={{ animationDuration: "1.2s" }}
            />
          )}
        </div>

        {/* Status indicator once assembled */}
        <div
          className={`mt-6 font-mono text-xs uppercase tracking-widest text-[#A3B0C8] transition-opacity duration-500 ${
            isAssembled ? "opacity-100" : "opacity-0"
          }`}
        >
          [INITIALIZING REAL-TIME TELEMETRY STREAM...]
        </div>
      </div>
    </div>
  );
}
