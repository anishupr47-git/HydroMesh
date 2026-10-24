"use client";

import React from "react";

interface ChakraBackgroundProps {
  size?: number;
  className?: string;
  speed?: "slow" | "medium" | "fast";
  opacity?: number;
}

export default function ChakraBackground({
  size = 940,
  className = "",
  speed = "slow",
  opacity = 0.35,
}: ChakraBackgroundProps) {
  const vanes = Array.from({ length: 24 });
  const ticks = Array.from({ length: 72 });

  const animClass =
    speed === "fast"
      ? "animate-chakra-fast"
      : speed === "medium"
      ? "animate-chakra"
      : "animate-chakra";

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        opacity,
      }}
    >
      <svg
        viewBox="0 0 1000 1000"
        className={`w-full h-full ${animClass}`}
        style={{
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <defs>
          {/* Brass Radial Gradient */}
          <radialGradient id="brassHub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F0D27A" />
            <stop offset="40%" stopColor="#C9A24B" />
            <stop offset="85%" stopColor="#6F5A2C" />
            <stop offset="100%" stopColor="#13264A" />
          </radialGradient>

          {/* Vane Gradient */}
          <linearGradient id="vaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0D27A" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#C9A24B" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#6F5A2C" stopOpacity="0.2" />
          </linearGradient>

          {/* Golden Glint Filter */}
          <filter id="chakraGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Concentric Rim 1 */}
        <circle
          cx="500"
          cy="500"
          r="485"
          fill="none"
          stroke="#C9A24B"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          opacity="0.5"
        />

        {/* Outer Concentric Rim 2 */}
        <circle
          cx="500"
          cy="500"
          r="470"
          fill="none"
          stroke="#C9A24B"
          strokeWidth="2.5"
          opacity="0.85"
        />

        {/* Outer Rim 72 Vernier Ticks */}
        <g transform="translate(500, 500)">
          {ticks.map((_, i) => (
            <line
              key={i}
              x1="0"
              y1="-470"
              x2="0"
              y2={i % 6 === 0 ? "-454" : "-462"}
              stroke="#C9A24B"
              strokeWidth={i % 6 === 0 ? "2" : "1"}
              transform={`rotate(${i * 5})`}
              opacity={i % 6 === 0 ? 0.9 : 0.45}
            />
          ))}
        </g>

        {/* Intermediate Ring */}
        <circle
          cx="500"
          cy="500"
          r="420"
          fill="none"
          stroke="#C9A24B"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* Secondary Shroud Ring */}
        <circle
          cx="500"
          cy="500"
          r="380"
          fill="none"
          stroke="#F0D27A"
          strokeWidth="1.5"
          strokeDasharray="16 12"
          opacity="0.6"
        />

        {/* 24 Curved Francis Runner Vanes */}
        <g transform="translate(500, 500)">
          {vanes.map((_, i) => (
            <g key={i} transform={`rotate(${i * 15})`}>
              {/* Hydrofoil curve from inner hub (r=140) to outer shroud (r=450) */}
              <path
                d="M 0 -140 C 65 -180, 160 -290, 110 -460 C 95 -460, 45 -290, -15 -140 Z"
                fill="url(#vaneGrad)"
                stroke="#C9A24B"
                strokeWidth="0.8"
                filter="url(#chakraGlow)"
              />
              {/* Trailing edge glint line */}
              <path
                d="M 110 -460 C 130 -330, 75 -220, 0 -140"
                fill="none"
                stroke="#F0D27A"
                strokeWidth="1"
                opacity="0.5"
              />
            </g>
          ))}
        </g>

        {/* Inner Chamber Fill */}
        <circle
          cx="500"
          cy="500"
          r="165"
          fill="#13264A"
          stroke="#C9A24B"
          strokeWidth="2"
          opacity="0.9"
        />

        {/* Hub Concentric Inner Rings */}
        <circle
          cx="500"
          cy="500"
          r="140"
          fill="none"
          stroke="#F0D27A"
          strokeWidth="1.5"
          opacity="0.75"
        />
        <circle
          cx="500"
          cy="500"
          r="110"
          fill="none"
          stroke="#C9A24B"
          strokeWidth="2"
          strokeDasharray="6 6"
          opacity="0.8"
        />

        {/* Central Dynamo Hub */}
        <circle
          cx="500"
          cy="500"
          r="70"
          fill="url(#brassHub)"
          stroke="#F0D27A"
          strokeWidth="3"
        />

        {/* Central Jewel Diamond */}
        <rect
          x="488"
          y="488"
          width="24"
          height="24"
          transform="rotate(45 500 500)"
          fill="#0B1424"
          stroke="#F0D27A"
          strokeWidth="2"
        />
        <circle cx="500" cy="500" r="4" fill="#F0D27A" />

        {/* 8 Hub Bolts */}
        <g transform="translate(500, 500)">
          {Array.from({ length: 8 }).map((_, i) => (
            <circle
              key={i}
              cx="0"
              cy="-92"
              r="4.5"
              fill="#F0D27A"
              stroke="#6F5A2C"
              strokeWidth="1.5"
              transform={`rotate(${i * 45})`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
