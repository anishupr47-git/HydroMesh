"use client";

import React, { useEffect, useState } from "react";
import ChakraBackground from "./ChakraBackground";

interface CinematicIntroProps {
  onComplete: () => void;
}

interface LetterItem {
  char: string;
  delayMs: number;
  wordIdx: number;
}

// "WELCOME TO HYDROMESH"
const LETTERS: LetterItem[] = [
  // WELCOME (120ms intervals)
  { char: "W", delayMs: 100, wordIdx: 0 },
  { char: "E", delayMs: 220, wordIdx: 0 },
  { char: "L", delayMs: 340, wordIdx: 0 },
  { char: "C", delayMs: 460, wordIdx: 0 },
  { char: "O", delayMs: 580, wordIdx: 0 },
  { char: "M", delayMs: 700, wordIdx: 0 },
  { char: "E", delayMs: 820, wordIdx: 0 },

  // Space / breath
  // TO (+180ms breath)
  { char: "T", delayMs: 1000, wordIdx: 1 },
  { char: "O", delayMs: 1120, wordIdx: 1 },

  // Space / breath
  // HYDROMESH (tight cascade)
  { char: "H", delayMs: 1300, wordIdx: 2 },
  { char: "Y", delayMs: 1400, wordIdx: 2 },
  { char: "D", delayMs: 1500, wordIdx: 2 },
  { char: "R", delayMs: 1600, wordIdx: 2 },
  { char: "O", delayMs: 1700, wordIdx: 2 },
  { char: "M", delayMs: 1800, wordIdx: 2 },
  { char: "E", delayMs: 1900, wordIdx: 2 },
  { char: "S", delayMs: 2000, wordIdx: 2 },
  { char: "H", delayMs: 2100, wordIdx: 2 },
];

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  // Track which letters have landed (triggered ripple)
  const [landedIndices, setLandedIndices] = useState<Set<number>>(new Set());
  const [sweepActive, setSweepActive] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Schedule letter landings
    const timers: NodeJS.Timeout[] = [];

    LETTERS.forEach((item, index) => {
      // Landing happens ~400ms after fall starts
      const landTimer = setTimeout(() => {
        setLandedIndices((prev) => {
          const next = new Set(prev);
          next.add(index);
          return next;
        });
      }, item.delayMs + 380);
      timers.push(landTimer);
    });

    // Golden light beam sweeps at t = 2.8s
    const sweepTimer = setTimeout(() => {
      setSweepActive(true);
    }, 2750);
    timers.push(sweepTimer);

    // Cross-fade out to Phase 2 at t = 3.9s
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 3850);
    timers.push(fadeTimer);

    // Complete call at t = 4.4s
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4400);
    timers.push(completeTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  // Group letters into words for responsive layout
  const word0 = LETTERS.filter((l) => l.wordIdx === 0);
  const word1 = LETTERS.filter((l) => l.wordIdx === 1);
  const word2 = LETTERS.filter((l) => l.wordIdx === 2);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1424] overflow-hidden transition-opacity duration-700 ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#0B1424",
      }}
    >
      {/* Background Rotating Brass Turbine Chakra */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="relative"
          style={{
            transform: "scale(1.15)",
            filter: "drop-shadow(0 0 60px rgba(201, 162, 75, 0.12))",
          }}
        >
          <ChakraBackground size={860} opacity={0.22} />
        </div>
      </div>

      {/* Atmospheric Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(15, 29, 56, 0.4) 0%, rgba(11, 20, 36, 0.95) 100%)",
        }}
      />

      {/* Skip Intro Button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-8 z-50 px-4 py-2 text-xs font-mono tracking-widest text-[#C9A24B] hover:text-[#F0D27A] border border-[#C9A24B]/40 hover:border-[#C9A24B] bg-[#0F1A2E]/80 backdrop-blur-md rounded transition-all duration-200 cursor-pointer"
        style={{
          letterSpacing: "0.14em",
        }}
      >
        [SKIP INTRO →]
      </button>

      {/* Center Cinematic Title Canvas */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-4xl text-center">
        {/* Subtitle kicker */}
        <div
          className="text-xs uppercase tracking-[0.28em] text-[#C9A24B] font-mono mb-4 transition-opacity duration-1000 delay-300"
          style={{
            opacity: landedIndices.size > 2 ? 0.9 : 0,
            textShadow: "0 0 12px rgba(201, 162, 75, 0.4)",
          }}
        >
          Himalayan Hydropower Autonomous Guardian
        </div>

        {/* Rain of Letters Text Container */}
        <div
          className="relative inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-[#F1EAD9] select-none py-4 px-6 overflow-hidden"
          style={{
            fontVariantNumeric: "lining-nums tabular-nums",
          }}
        >
          {/* Golden Sweep Beam */}
          {sweepActive && (
            <div
              className="absolute inset-y-0 w-32 pointer-events-none z-20"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(240, 210, 122, 0.55), rgba(255, 255, 255, 0.9), rgba(240, 210, 122, 0.55), transparent)",
                animation: "golden-sweep 1.2s ease-in-out forwards",
                transform: "skewX(-20deg)",
              }}
            />
          )}

          {/* WORD 1: WELCOME */}
          <div className="inline-flex">
            {word0.map((item, localIdx) => {
              const globalIdx = localIdx;
              const hasLanded = landedIndices.has(globalIdx);

              return (
                <div key={globalIdx} className="relative inline-block px-[2px]">
                  {/* Water Ripple Ring on Impact */}
                  {hasLanded && (
                    <span
                      className="absolute left-1/2 bottom-1 -translate-x-1/2 pointer-events-none w-8 h-3 rounded-full border border-[#C9A24B]"
                      style={{
                        animation: "water-ripple 0.65s ease-out forwards",
                      }}
                    />
                  )}

                  {/* Falling Letter */}
                  <span
                    className="inline-block"
                    style={{
                      animation: `letter-drop 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${item.delayMs}ms both`,
                      textShadow: hasLanded
                        ? "0 0 18px rgba(201, 162, 75, 0.65), 0 2px 4px rgba(0,0,0,0.8)"
                        : "none",
                    }}
                  >
                    {item.char}
                  </span>
                </div>
              );
            })}
          </div>

          {/* WORD 2: TO */}
          <div className="inline-flex">
            {word1.map((item, localIdx) => {
              const globalIdx = word0.length + localIdx;
              const hasLanded = landedIndices.has(globalIdx);

              return (
                <div key={globalIdx} className="relative inline-block px-[2px]">
                  {hasLanded && (
                    <span
                      className="absolute left-1/2 bottom-1 -translate-x-1/2 pointer-events-none w-8 h-3 rounded-full border border-[#C9A24B]"
                      style={{
                        animation: "water-ripple 0.65s ease-out forwards",
                      }}
                    />
                  )}
                  <span
                    className="inline-block"
                    style={{
                      animation: `letter-drop 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${item.delayMs}ms both`,
                      textShadow: hasLanded
                        ? "0 0 18px rgba(201, 162, 75, 0.65), 0 2px 4px rgba(0,0,0,0.8)"
                        : "none",
                    }}
                  >
                    {item.char}
                  </span>
                </div>
              );
            })}
          </div>

          {/* WORD 3: HYDROMESH */}
          <div className="inline-flex">
            {word2.map((item, localIdx) => {
              const globalIdx = word0.length + word1.length + localIdx;
              const hasLanded = landedIndices.has(globalIdx);

              return (
                <div key={globalIdx} className="relative inline-block px-[2px]">
                  {hasLanded && (
                    <span
                      className="absolute left-1/2 bottom-1 -translate-x-1/2 pointer-events-none w-8 h-3 rounded-full border border-[#C9A24B]"
                      style={{
                        animation: "water-ripple 0.65s ease-out forwards",
                      }}
                    />
                  )}
                  <span
                    className="inline-block"
                    style={{
                      color:
                        item.char === "M" ||
                        item.char === "E" ||
                        item.char === "S" ||
                        item.char === "H"
                          ? "#F0D27A"
                          : "#F1EAD9",
                      animation: `letter-drop 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${item.delayMs}ms both`,
                      textShadow: hasLanded
                        ? "0 0 20px rgba(240, 210, 122, 0.75), 0 2px 4px rgba(0,0,0,0.8)"
                        : "none",
                    }}
                  >
                    {item.char}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vernier Ticking Strip */}
        <div
          className="vernier-strip max-w-md w-full transition-opacity duration-1000 mt-2"
          style={{
            opacity: sweepActive ? 0.9 : 0,
          }}
        >
          <div className="vernier-jewel" />
        </div>

        {/* Tagline Footer */}
        <p
          className="text-sm font-sans text-[#A3B0C8] tracking-widest uppercase transition-opacity duration-700 mt-3"
          style={{
            opacity: sweepActive ? 0.85 : 0,
            letterSpacing: "0.18em",
          }}
        >
          Run-Of-River Silt & Flood Predictive Intelligence System
        </p>
      </div>
    </div>
  );
}
