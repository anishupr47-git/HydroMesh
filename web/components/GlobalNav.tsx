"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface GlobalNavProps {
  mode: "global" | "individual";
  onModeChange: (m: "global" | "individual") => void;
  activeCriticalCount?: number;
  activeWarningCount?: number;
  totalSites?: number;
  userEmail?: string | null;
  userRole?: string;
  onOpenAuth?: () => void;
  onOpenInspector?: () => void;
  onReplayIntro?: () => void;
}

export default function GlobalNav({
  mode,
  onModeChange,
  activeCriticalCount = 0,
  activeWarningCount = 0,
  totalSites = 20,
  userEmail = null,
  userRole = "guest",
  onOpenAuth,
  onOpenInspector,
  onReplayIntro,
}: GlobalNavProps) {
  const [nstTime, setNstTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      // Nepal Standard Time is UTC + 5:45
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const nstDate = new Date(utcMs + (5 * 60 + 45) * 60000);
      const hours = nstDate.getHours().toString().padStart(2, "0");
      const mins = nstDate.getMinutes().toString().padStart(2, "0");
      const secs = nstDate.getSeconds().toString().padStart(2, "0");
      setNstTime(`${hours}:${mins}:${secs} NST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const overallAlertTier =
    activeCriticalCount > 0
      ? "CRITICAL"
      : activeWarningCount > 0
      ? "WARNING"
      : "NORMAL";

  const tierColor =
    overallAlertTier === "CRITICAL"
      ? "#E0705A"
      : overallAlertTier === "WARNING"
      ? "#E0A43A"
      : "#5FB3A8";

  return (
    <header className="sticky top-0 z-50 bg-[#0F1A2E]/95 backdrop-blur-md border-b border-[#C9A24B] px-4 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-3">
      {/* Left: Francis Runner Glyph + HydroMesh Branding + Mode Switcher */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Rotating Francis Runner Glyph */}
          <div className="w-7 h-7 rounded-full border border-[#C9A24B] flex items-center justify-center bg-[#0B1424] shadow-[0_0_8px_rgba(201,162,75,0.4)]">
            <svg
              viewBox="0 0 100 100"
              className="w-5 h-5 animate-chakra"
              style={{ transformOrigin: "center" }}
            >
              <g transform="translate(50, 50)">
                {Array.from({ length: 8 }).map((_, i) => (
                  <path
                    key={i}
                    d="M 0 -12 C 10 -22, 20 -35, 12 -45 C 5 -45, 2 -25, 0 -12 Z"
                    fill="#F0D27A"
                    transform={`rotate(${i * 45})`}
                  />
                ))}
                <circle cx="0" cy="0" r="10" fill="#C9A24B" />
              </g>
            </svg>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#F1EAD9]">
                Hydro<span className="text-[#F0D27A]">Mesh</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#C9A24B]">
                SCADA
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#A3B0C8] -mt-1 hidden sm:block">
              Himalayan River Guardian
            </div>
          </div>
        </Link>

        {/* View Tabs: [MY PLANT] vs [GLOBAL FLEET] */}
        <div className="flex items-center bg-[#0B1424] border border-[#C9A24B]/40 rounded-sm p-0.5 ml-2">
          <button
            onClick={() => onModeChange("individual")}
            className={`px-3 py-1 rounded-sm text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${
              mode === "individual"
                ? "bg-[#C9A24B] text-[#0B1424] font-bold shadow-[0_1px_4px_rgba(201,162,75,0.4)]"
                : "text-[#A3B0C8] hover:text-[#F1EAD9]"
            }`}
          >
            [MY PLANT]
          </button>
          <button
            onClick={() => onModeChange("global")}
            className={`px-3 py-1 rounded-sm text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${
              mode === "global"
                ? "bg-[#C9A24B] text-[#0B1424] font-bold shadow-[0_1px_4px_rgba(201,162,75,0.4)]"
                : "text-[#A3B0C8] hover:text-[#F1EAD9]"
            }`}
          >
            [GLOBAL FLEET]
          </button>
        </div>
      </div>

      {/* Center: Real-Time Fleet Health Pill */}
      <div className="hidden lg:flex items-center gap-3 bg-[#0B1424] border border-[#C9A24B]/30 rounded-full px-4 py-1 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: tierColor,
              boxShadow: `0 0 8px ${tierColor}`,
            }}
          />
          <span className="text-[#F1EAD9] font-medium">
            {totalSites} Active Himalayan Stations
          </span>
        </div>
        <span className="text-[#C9A24B]/40">|</span>
        <span className="text-[#A3B0C8]">
          Satellite Link: <strong className="text-[#5FB3A8]">NASA GPM & ECMWF 9km</strong>
        </span>
      </div>

      {/* Right: NST Clock, Replay Intro & Operator Profile */}
      <div className="flex items-center gap-3">
        {/* Live NST Clock */}
        <div
          className="font-mono text-xs text-[#F0D27A] font-semibold tracking-wider bg-[#0B1424] px-2.5 py-1 border border-[#C9A24B]/30 rounded-sm"
          title="Nepal Standard Time (UTC+5:45)"
        >
          ⏱️ {nstTime || "12:00:00 NST"}
        </div>

        {/* Replay Cinematic Intro Button */}
        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            className="px-2.5 py-1 text-xs font-mono text-[#C9A24B] hover:text-[#F0D27A] border border-[#C9A24B]/40 hover:border-[#C9A24B] bg-[#0B1424] rounded-sm transition-colors cursor-pointer"
            title="Replay 4-Phase Cinematic Entry Flow"
          >
            [↺ REPLAY INTRO]
          </button>
        )}

        {/* Inspector Button */}
        {onOpenInspector && (
          <button
            onClick={onOpenInspector}
            className="hidden sm:block px-2.5 py-1 text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] border border-[#C9A24B]/30 bg-[#0B1424] rounded-sm transition-colors cursor-pointer"
          >
            [📋 AUDIT]
          </button>
        )}

        <Link
          href="/safety"
          className="hidden md:block px-2.5 py-1 text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] border border-[#C9A24B]/30 bg-[#0B1424] rounded-sm transition-colors"
        >
          [🛡️ R1–R11]
        </Link>

        {/* Operator Badge & Auth Trigger */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 px-3 py-1 bg-[#13264A] hover:bg-[#1a3364] border border-[#C9A24B] text-xs font-mono text-[#F1EAD9] rounded-sm transition-all cursor-pointer shadow-[0_0_8px_rgba(201,162,75,0.2)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#5FB3A8]" />
          <span>{userEmail ? userEmail.split("@")[0] : "GUEST OPERATOR"}</span>
          <span className="text-[10px] text-[#C9A24B]">
            [{userRole === "guest" ? "GUEST" : "STATION PRO"}]
          </span>
        </button>
      </div>
    </header>
  );
}
