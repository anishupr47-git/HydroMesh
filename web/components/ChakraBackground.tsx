"use client";

import React from "react";

interface ChakraBackgroundProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  speed?: "slow" | "medium" | "fast" | string;
  opacity?: number;
}

export default function ChakraBackground({
  size = 940,
  className = "",
  style = {},
  speed = "slow",
  opacity = 0.35,
}: ChakraBackgroundProps) {
  // 24 outer blades: rotate(i * 15), delay (i * 0.25 - 6)s
  const bladesA = Array.from({ length: 24 }).map((_, i) => ({
    transform: `rotate(${i * 15})`,
    animationDelay: `${(i * 0.25 - 6).toFixed(2)}s`,
  }));

  // 12 inner blades: rotate(i * 30), delay (i * 0.4 - 4.8)s
  const bladesB = Array.from({ length: 12 }).map((_, i) => ({
    transform: `rotate(${i * 30})`,
    animationDelay: `${(i * 0.4 - 4.8).toFixed(2)}s`,
  }));

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none relative overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
    >
      {/* 1. Base Concentric Shroud */}
      <svg
        style={{ position: "absolute", left: 0, top: 0 }}
        width={size}
        height={size}
        viewBox="-470 -470 940 940"
        fill="none"
      >
        <circle r="462" fill="none" stroke="#c9a24b" strokeOpacity=".3" />
        <circle r="428" stroke="#c9a24b" strokeWidth="1.5" />
        <circle
          r="416"
          stroke="#c9a24b"
          strokeOpacity=".7"
          strokeWidth="9"
          strokeDasharray="2 19.78"
        />
        <circle r="402" stroke="#c9a24b" strokeWidth=".8" />
      </svg>

      {/* 2. Outer Shroud Teeth (Slow Clockwise Spin: rT 160s) */}
      <svg
        className="rot rT"
        style={{ position: "absolute", left: 0, top: 0 }}
        width={size}
        height={size}
        viewBox="-470 -470 940 940"
        fill="none"
      >
        <circle
          r="444"
          stroke="#5c4d28"
          strokeWidth="18"
          strokeDasharray="24 22.5"
        />
      </svg>

      {/* 3. Outer 24 Curved Francis Vanes with Metallic Glint (rA 90s) */}
      <svg
        className="rot rA"
        style={{ position: "absolute", left: 0, top: 0 }}
        width={size}
        height={size}
        viewBox="-470 -470 940 940"
        fill="none"
      >
        {bladesA.map((b, i) => (
          <path
            key={i}
            className="bl"
            d="M0 -180 C 46 -236 64 -330 22 -396 L -8 -396 C 34 -330 18 -250 -30 -184 Z"
            transform={b.transform}
            style={{ animationDelay: b.animationDelay }}
          />
        ))}
      </svg>

      {/* 4. Intermediate Core Hub Ring */}
      <svg
        style={{ position: "absolute", left: 0, top: 0 }}
        width={size}
        height={size}
        viewBox="-470 -470 940 940"
        fill="none"
      >
        <circle r="176" fill="#0f1d38" stroke="#c9a24b" strokeWidth="2" />
        <circle r="168" stroke="#c9a24b" strokeOpacity=".5" strokeWidth=".8" />
      </svg>

      {/* 5. Inner 12 Runner Impellers with Counter-Clockwise Glint (rB 36s reverse) */}
      <svg
        className="rot rB"
        style={{ position: "absolute", left: 0, top: 0 }}
        width={size}
        height={size}
        viewBox="-470 -470 940 940"
        fill="none"
      >
        {bladesB.map((b, i) => (
          <path
            key={i}
            className="bl bl2"
            d="M0 -66 C 22 -96 30 -130 10 -160 L -6 -160 C 14 -130 6 -100 -16 -70 Z"
            transform={b.transform}
            style={{ animationDelay: b.animationDelay }}
          />
        ))}
      </svg>

      {/* 6. Central Dynamo Spoke Cross and Concentric Shaft Jewel (rC 20s reverse) */}
      <svg
        className="rot rC"
        style={{ position: "absolute", left: 0, top: 0 }}
        width={size}
        height={size}
        viewBox="-470 -470 940 940"
        fill="none"
      >
        <path
          d="M-168 0H168M0 -168V168M-119 -119L119 119M-119 119L119 -119"
          stroke="#c9a24b"
          strokeOpacity=".8"
          strokeWidth="1.5"
        />
        <circle r="58" fill="#c9a24b" />
        <circle r="46" fill="#0f1d38" />
        <circle r="38" stroke="#c9a24b" />
        <circle
          r="30"
          stroke="#c9a24b"
          strokeWidth="6"
          strokeDasharray="3 28.4"
        />
        <circle r="12" fill="#c9a24b" />
      </svg>
    </div>
  );
}
