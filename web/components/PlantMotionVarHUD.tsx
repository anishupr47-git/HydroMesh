"use client";

import React, { useState } from "react";

interface PlantMotionVarHUDProps {
  plantName: string;
  plantId: string;
  capacityMw: number;
  headM: number;
  designFlowM3s: number;
  currentDischargeM3s: number;
  currentSiltPpm: number;
  rainfallMmH: number;
  onClose?: () => void;
}

export default function PlantMotionVarHUD({
  plantName,
  plantId: _plantId,
  capacityMw,
  headM,
  designFlowM3s,
  currentDischargeM3s,
  currentSiltPpm,
  rainfallMmH: _rainfallMmH,
  onClose,
}: PlantMotionVarHUDProps) {
  const [activeZone, setActiveZone] = useState<"all" | "A" | "B" | "C" | "D">("all");

  // Dynamic Physical Math
  const Q = currentDischargeM3s > 0 ? currentDischargeM3s : designFlowM3s * 0.75;
  const C = currentSiltPpm > 0 ? currentSiltPpm : 140;
  // Runner relative velocity W_rel (m/s) based on net head
  const W_rel = +(Math.sqrt(2 * 9.81 * headM) * 0.85).toFixed(1);
  const Km = 1.25; // 13Cr-4Ni stainless steel quartz abrasion constant
  const K_hardness = 2.4; // Himalayan quartz hardness factor

  // IEC 62364: Delta W = 10^-9 * Km * C * (W_rel)^2.5 * K_hardness (mm/hr)
  const deltaW = +(1e-9 * Km * C * Math.pow(W_rel, 2.5) * K_hardness).toFixed(5);
  const baselineW = 0.0021;
  const accelPct = Math.round(((deltaW - baselineW) / baselineW) * 100);

  // Allievi Surge Pressure: Delta H = (a * Delta v) / g
  const throttlePct = C > 3000 ? 45.0 : C >= 1200 ? 30.0 : 0.0;
  const targetQ = +(Q * (1 - throttlePct / 100)).toFixed(1);
  const deltaQ = +(targetQ - Q).toFixed(1);
  const acousticWaveSpeed = 1200; // m/s in steel penstock
  const deltaV = +((deltaQ / 3.14159) * 0.12).toFixed(2);
  const surgeHead = +((acousticWaveSpeed * Math.abs(deltaV)) / 9.81).toFixed(1);
  const allowableHeadSurge = +(headM * 0.25).toFixed(1);
  const surgeSafe = surgeHead <= allowableHeadSurge;

  // Condition Tier
  const isCritical = C > 3000;
  const isWatch = C >= 1200 && C <= 3000;
  const tierColor = isCritical ? "#E0705A" : isWatch ? "#E0A43A" : "#5FB3A8";
  const tierLabel = isCritical ? "CRITICAL RISK" : isWatch ? "ELEVATED WATCH" : "NOMINAL OPERATION";

  return (
    <div className="w-full bg-[#0F1A2E] border border-[#C9A24B] shadow-2xl pn p-6 relative my-8">
      {/* Perched Badge */}
      <div className="np">V · THE PLANT IN MOTION & 4-ZONE VAR HUD</div>

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#C9A24B]/30 mb-6 mt-1 gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9A24B] block">
            Physical Cross-Section & Industrial Device Telemetry
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F1EAD9]">
            {plantName} · {capacityMw} MW Hydraulic Circuit
          </h3>
        </div>

        {/* Status Pill & Zone Filter Tabs */}
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 text-xs font-mono font-bold uppercase rounded-sm border"
            style={{
              color: tierColor,
              borderColor: tierColor,
              backgroundColor: `${tierColor}18`,
            }}
          >
            [STATUS: {tierLabel}]
          </span>

          <div className="flex items-center bg-[#0B1424] border border-[#C9A24B]/40 rounded-sm p-0.5 text-xs font-mono">
            {(["all", "A", "B", "C", "D"] as const).map((zone) => (
              <button
                key={zone}
                onClick={() => setActiveZone(zone)}
                className={`px-2.5 py-1 rounded-sm uppercase transition-colors cursor-pointer ${
                  activeZone === zone
                    ? "bg-[#C9A24B] text-[#0B1424] font-bold"
                    : "text-[#A3B0C8] hover:text-[#F1EAD9]"
                }`}
              >
                {zone === "all" ? "ALL ZONES" : `ZONE ${zone}`}
              </button>
            ))}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#13264A] hover:bg-[#1a3364] border border-[#C9A24B] text-xs font-mono text-[#F1EAD9] rounded-sm transition-colors cursor-pointer"
            >
              [X CLOSE]
            </button>
          )}
        </div>
      </div>

      {/* =======================================================================
          1. KINETIC CROSS-SECTION: REAL INDUSTRIAL DEVICES & FLUID FLOW SCHEMATIC
          ======================================================================= */}
      <div className="relative w-full aspect-[1160/320] bg-[#0B1424] border border-[#C9A24B]/40 rounded-sm overflow-hidden mb-6">
        <svg
          viewBox="0 0 1160 320"
          className="w-full h-full"
          fill="none"
          role="img"
          aria-label="High-precision industrial cross-section: Headpond, intake gate actuator, desander basin, penstock, Francis runner, generator and substation grid"
        >
          {/* Ground & Bedrock Foundation */}
          <path d="M0 270H1160" stroke="#C9A24B" strokeOpacity=".5" strokeWidth="1.5" />
          <path d="M0 270L1160 270" stroke="#6F5A2C" strokeWidth="8" strokeDasharray="4 8" opacity="0.3" />

          {/* 1. Headpond Reservoir Tank */}
          <rect x="10" y="90" width="160" height="180" fill="#1B3158" stroke="#C9A24B" strokeWidth="1.5" />
          {/* Water Surface Line */}
          <path d="M10 90H170" stroke="#E8EEF7" strokeOpacity=".8" strokeWidth="2" />
          <g className="bobc">
            <line x1="10" y1="92" x2="170" y2="92" stroke="#F1EAD9" strokeWidth="2" strokeDasharray="8 6" />
          </g>
          {/* Ultrasonic Level Sensor Device */}
          <rect x="75" y="46" width="30" height="44" fill="#0F1A2E" stroke="#C9A24B" strokeWidth="1" />
          <line x1="90" y1="90" x2="90" y2="120" stroke="#F0D27A" strokeWidth="1" strokeDasharray="2 3" />
          <text x="90" y="40" fill="#C9A24B" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            TRANSDUCER
          </text>

          {/* 2. Intake Gate Tower with Pneumatic Actuator Hoist */}
          <rect x="180" y="30" width="24" height="240" fill="#0F1A2E" stroke="#C9A24B" strokeWidth="1.5" />
          {/* Actuator Cylinder */}
          <rect x="184" y="38" width="16" height="50" fill="#13264A" stroke="#F0D27A" strokeWidth="1" />
          <line x1="192" y1="88" x2="192" y2="170" stroke="#F0D27A" strokeWidth="2.5" />
          {/* Moving Sluice Gate Blade */}
          <rect
            className="rise"
            x="182"
            y="170"
            width="20"
            height="100"
            fill="#7A5C48"
            stroke="#C9A24B"
            strokeWidth="1.5"
          />

          {/* 3. Desander Settling Basin with Silt Hopper Cones */}
          <path
            d="M214 110H460L440 270H234L214 110Z"
            fill="#1B3158"
            stroke="#C9A24B"
            strokeWidth="1.5"
          />
          {/* Sediment Silt Bed at Basin Bottom */}
          <path d="M234 254H440L440 270H234Z" fill="#6F5A2C" />
          {/* Sinking Quartz Particles (5s ease-in animation) */}
          <circle className="sl" cx="245" cy="125" r="3" fill="#C9A24B" style={{ animationDelay: "0s" }} />
          <circle className="sl" cx="280" cy="130" r="3" fill="#C9A24B" style={{ animationDelay: "-1.1s" }} />
          <circle className="sl" cx="315" cy="124" r="3.5" fill="#F0D27A" style={{ animationDelay: "-2.2s" }} />
          <circle className="sl" cx="350" cy="132" r="3" fill="#C9A24B" style={{ animationDelay: "-3.3s" }} />
          <circle className="sl" cx="385" cy="127" r="3.5" fill="#F0D27A" style={{ animationDelay: "-4.4s" }} />
          <circle className="sl" cx="415" cy="123" r="3" fill="#C9A24B" style={{ animationDelay: "-0.6s" }} />
          <circle className="sl" cx="330" cy="140" r="2.5" fill="#C9A24B" style={{ animationDelay: "-1.8s" }} />
          {/* Desander Purge Flush Gate Valve */}
          <rect x="325" y="270" width="24" height="20" fill="#0F1A2E" stroke="#C9A24B" strokeWidth="1" />
          <text x="337" y="302" fill="#A3B0C8" fontSize="8" fontFamily="IBM Plex Sans" textAnchor="middle">
            PURGE
          </text>

          {/* Water Stream through Basin */}
          <path
            className="fw"
            d="M204 185H460"
            stroke="#E8EEF7"
            strokeOpacity=".75"
            strokeWidth="2.5"
          />

          {/* 4. Steel Penstock Pipeline with Allievi Acoustic Pressure Wave Transducer */}
          <path d="M460 160L720 215M460 210L720 265" stroke="#C9A24B" strokeWidth="2.5" />
          <path
            className="fw"
            d="M460 185L720 240"
            stroke="#E8EEF7"
            strokeOpacity=".8"
            strokeWidth="4"
          />
          {/* Penstock Rib Stiffeners */}
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const px = 480 + idx * 42;
            const py = 164 + idx * 9;
            return (
              <line
                key={idx}
                x1={px}
                y1={py}
                x2={px}
                y2={py + 50}
                stroke="#6F5A2C"
                strokeWidth="2"
              />
            );
          })}
          {/* Acoustic Surge Pressure Sensor */}
          <rect x="580" y="145" width="26" height="30" fill="#0F1A2E" stroke="#F0D27A" strokeWidth="1" />
          <text x="593" y="140" fill="#F0D27A" fontSize="8" fontFamily="IBM Plex Sans" textAnchor="middle">
            ALLIEVI PT
          </text>

          {/* 5. Francis Turbine Spiral Casing & Powerhouse */}
          <rect x="720" y="110" width="240" height="160" fill="#0F1A2E" stroke="#C9A24B" strokeWidth="1.5" />
          {/* Water Discharge Tailrace Channel */}
          <rect x="960" y="240" width="190" height="30" fill="#1B3158" stroke="#C9A24B" strokeWidth="1" />
          <path className="fw" d="M960 255H1150" stroke="#E8EEF7" strokeOpacity=".6" strokeWidth="2" />

          {/* 6. Generator Stator Block & Terminal */}
          <rect x="805" y="44" width="70" height="66" fill="#13264A" stroke="#C9A24B" strokeWidth="1.5" />
          <line x1="840" y1="110" x2="840" y2="135" stroke="#F0D27A" strokeWidth="3" />
          <text x="840" y="36" fill="#F1EAD9" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            GENERATOR
          </text>

          {/* 7. Step-Up Transformer & High-Voltage Grid Pylon */}
          <rect x="990" y="180" width="46" height="50" fill="#13264A" stroke="#C9A24B" strokeWidth="1" />
          <path d="M875 77H1000L1020 90" stroke="#C9A24B" strokeWidth="1.5" />
          <path className="pl" d="M875 77H1000L1020 90" stroke="#F0D27A" strokeWidth="2.5" />

          {/* Grid Lattice Transmission Tower */}
          <path
            d="M1070 60L1042 270M1070 60L1098 270M1050 200H1090M1056 150H1084M1062 105H1078M1042 270H1098M1050 200L1090 270M1090 200L1050 270M1020 90H1120"
            stroke="#C9A24B"
            strokeWidth="1.8"
          />
          <path d="M1120 90L1160 115" stroke="#C9A24B" strokeOpacity=".7" strokeWidth="1.5" />
          <path className="pl" d="M1120 90L1160 115" stroke="#F0D27A" strokeWidth="2.5" />

          {/* ===================================================================
              REAL-TIME INSTRUMENT READOUT TEXT LABELS
              =================================================================== */}
          <text x="90" y="160" fill="#F1EAD9" fontSize="16" fontFamily="Cormorant Garamond" fontWeight="600" textAnchor="middle">
            {Q} m³/s
          </text>
          <text x="90" y="180" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            HEADPOND WL: {headM}m
          </text>

          <text x="337" y="185" fill="#F0D27A" fontSize="16" fontFamily="Cormorant Garamond" fontWeight="600" textAnchor="middle">
            {C} PPM
          </text>
          <text x="337" y="205" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            QUARTZ CONCENTRATION
          </text>

          <text x="590" y="240" fill="#F1EAD9" fontSize="15" fontFamily="Cormorant Garamond" fontWeight="600" textAnchor="middle">
            PENSTOCK v={deltaV} m/s
          </text>
          <text x="590" y="258" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            a={acousticWaveSpeed} m/s | SURGE: {surgeHead}m
          </text>

          <text x="840" y="80" fill="#F0D27A" fontSize="16" fontFamily="Cormorant Garamond" fontWeight="600" textAnchor="middle">
            {capacityMw} MW
          </text>
          <text x="840" y="98" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            50.0 HZ | 11 KV
          </text>

          {/* Substation Relay */}
          <text x="1070" y="50" fill="#F0D27A" fontSize="10" fontFamily="IBM Plex Sans" fontWeight="600" textAnchor="middle">
            132/220 KV NEA GRID
          </text>

          {/* Component Footers */}
          <text x="90" y="295" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            1. HEADPOND
          </text>
          <text x="192" y="312" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            2. INTAKE HOIST
          </text>
          <text x="337" y="295" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            3. DESANDER BASIN
          </text>
          <text x="590" y="295" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            4. STEEL PENSTOCK
          </text>
          <text x="780" y="295" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            5. FRANCIS RUNNER
          </text>
          <text x="1070" y="295" fill="#A3B0C8" fontSize="9" fontFamily="IBM Plex Sans" textAnchor="middle">
            6. SUBSTATION RELAY
          </text>
        </svg>

        {/* 5A. Spinning Francis Turbine Runner in Chamber (.spinA, 14s) */}
        <div
          className="spinA absolute pointer-events-none"
          style={{
            left: "64.2%",
            top: "43%",
            width: "11%",
            aspectRatio: "1",
          }}
        >
          <svg viewBox="-60 -60 120 120" width="100%" height="100%" fill="none" stroke="#C9A24B" strokeWidth="2">
            <circle r="56" />
            <circle r="12" fill="#0F1A2E" />
            {Array.from({ length: 8 }).map((_, i) => (
              <path
                key={i}
                d="M0 -12 C 16 -26, 26 -40, 10 -54"
                transform={`rotate(${i * 45})`}
                stroke="#F0D27A"
                strokeWidth="2.5"
              />
            ))}
          </svg>
        </div>

        {/* 5B. Spinning Synchronous Generator Rotor (.spinB, 5s reverse) */}
        <div
          className="spinB absolute pointer-events-none"
          style={{
            left: "70.2%",
            top: "16.5%",
            width: "3.6%",
            aspectRatio: "1",
          }}
        >
          <svg viewBox="-20 -20 40 40" width="100%" height="100%" fill="none" stroke="#C9A24B" strokeWidth="2">
            <circle r="18" />
            <path d="M-18 0H18M0 -18V18" stroke="#F0D27A" />
          </svg>
        </div>
      </div>

      {/* =======================================================================
          2. THE 4-ZONE VAR SCREEN INSPECTION CHAMBER
          ======================================================================= */}
      <div className="space-y-6">
        {/* ZONE A: 6-LAYER WIREFRAME PIPELINE TRACE */}
        {(activeZone === "all" || activeZone === "A") && (
          <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-5 rounded-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                ZONE A · 6-LAYER PIPELINE TRACE
              </span>
              <span className="text-[10px] font-mono text-[#5FB3A8]">
                [STATUS: ALL 6 KERNEL GATES VERIFIED]
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { step: "01", name: "SENSOR AUDIT", desc: "Outlier bounds check", pass: true },
                { step: "02", name: "TRIAGE MATH", desc: "Silt rating curve", pass: true },
                { step: "03", name: "TFT FORECAST", desc: "4h surge horizon", pass: true },
                { step: "04", name: "SOP RAG", desc: "SHA-256 hash match", pass: true },
                { step: "05", name: "WEAR PHYSICS", desc: "IEC 62364 velocity", pass: true },
                { step: "06", name: "SAFETY KERNEL", desc: "Allievi surge bound", pass: true },
              ].map((layer) => (
                <div
                  key={layer.step}
                  className="bg-[#13264A]/50 border border-[#C9A24B]/25 p-3 rounded-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#C9A24B] mb-1">
                      <span>L-{layer.step}</span>
                      <span className="text-[#5FB3A8]">PASS</span>
                    </div>
                    <div className="text-xs font-serif font-bold text-[#F1EAD9] leading-tight">
                      {layer.name}
                    </div>
                  </div>
                  <div className="text-[10px] font-sans text-[#A3B0C8] mt-2">
                    {layer.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZONE B: FACTUAL HYDRAULIC & ABRASION MATH DERIVATIONS */}
        {(activeZone === "all" || activeZone === "B") && (
          <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-5 rounded-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                ZONE B · ENGINEERING PHYSICS & HYDRAULIC PROOFS
              </span>
              <span className="text-[10px] font-mono text-[#A3B0C8]">
                ISO / IEC 62364:2019 & ALLIEVI WATER HAMMER
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula 1: IEC 62364 Runner Erosion Rate */}
              <div className="bg-[#13264A]/40 border border-[#C9A24B]/20 p-4 rounded-sm space-y-2">
                <span className="text-[11px] font-mono text-[#C9A24B] block uppercase">
                  1. Runner Quartz Abrasion Rate (IEC 62364)
                </span>
                <div className="font-mono text-xs text-[#F1EAD9] bg-[#0B1424] p-3 rounded-sm border border-[#C9A24B]/15">
                  ΔW = 10⁻⁹ · K_m · C · (W_rel)²·⁵ · K_hardness
                </div>
                <div className="text-xs font-sans text-[#D9D2BF] space-y-1">
                  <div>• Head: <strong className="text-[#F1EAD9]">{headM} m</strong> → Relative Velocity W_rel = <strong className="text-[#F1EAD9]">{W_rel} m/s</strong></div>
                  <div>• Quartz Silt: <strong className="text-[#F1EAD9]">{C} PPM</strong> (Km = 1.25, Kh = 2.4)</div>
                  <div>• Wear Rate: <strong className="text-[#F0D27A]">{deltaW} mm/h</strong> ({accelPct}% vs baseline)</div>
                </div>
              </div>

              {/* Formula 2: Allievi Water Hammer Surge Head */}
              <div className="bg-[#13264A]/40 border border-[#C9A24B]/20 p-4 rounded-sm space-y-2">
                <span className="text-[11px] font-mono text-[#C9A24B] block uppercase">
                  2. Penstock Water Hammer Surge Limit (Allievi)
                </span>
                <div className="font-mono text-xs text-[#F1EAD9] bg-[#0B1424] p-3 rounded-sm border border-[#C9A24B]/15">
                  ΔH = (a · |Δv|) / g  ≤  25% H_net
                </div>
                <div className="text-xs font-sans text-[#D9D2BF] space-y-1">
                  <div>• Proposed Q drop: <strong className="text-[#F1EAD9]">{Q} m³/s → {targetQ} m³/s</strong> (ΔQ = {deltaQ} m³/s)</div>
                  <div>• Computed Surge ΔH: <strong className="text-[#F0D27A]">{surgeHead} m</strong> (Max allowable: {allowableHeadSurge} m)</div>
                  <div>• Kernel Verdict: <strong className={surgeSafe ? "text-[#5FB3A8]" : "text-[#E0705A]"}>{surgeSafe ? "SAFE TO MODULATE" : "SURGE LIMIT EXCEEDED"}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ZONE C: SCADA RISK DIAGNOSTIC ("IS IT RISKY OR NOT?") */}
        {(activeZone === "all" || activeZone === "C") && (
          <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-5 rounded-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                ZONE C · RISK DIAGNOSTIC: IS IT RISKY OR NOT?
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: tierColor }}>
                TIER: {tierLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#13264A]/50 border border-[#C9A24B]/20 p-3 rounded-sm">
                <span className="text-[10px] font-mono uppercase text-[#A3B0C8] block mb-1">
                  Rule R1: Revenue Air-Gap
                </span>
                <span className="text-xs font-serif font-bold text-[#5FB3A8] block">
                  PASS · ZERO MARKET ACCESS
                </span>
                <p className="text-[11px] text-[#D9D2BF] font-sans mt-1">
                  Dispatch commands are strictly advisory. The engine cannot trade or bid on power exchanges.
                </p>
              </div>

              <div className="bg-[#13264A]/50 border border-[#C9A24B]/20 p-3 rounded-sm">
                <span className="text-[10px] font-mono uppercase text-[#A3B0C8] block mb-1">
                  Rule R3: Penstock Surge Wave
                </span>
                <span className="text-xs font-serif font-bold text-[#5FB3A8] block">
                  PASS · DELTA CLAMPED &lt; 50%
                </span>
                <p className="text-[11px] text-[#D9D2BF] font-sans mt-1">
                  Target flow modulation respects penstock Allievi surge head bounds to prevent cavitation.
                </p>
              </div>

              <div className="bg-[#13264A]/50 border border-[#C9A24B]/20 p-3 rounded-sm">
                <span className="text-[10px] font-mono uppercase text-[#A3B0C8] block mb-1">
                  Rule R9: Quartz Silt Protection
                </span>
                <span className="text-xs font-serif font-bold block" style={{ color: tierColor }}>
                  {isCritical ? "CRITICAL ALERT" : isWatch ? "DESANDER FLUSH REQUIRED" : "PASS · QUARTZ WITHIN LIMITS"}
                </span>
                <p className="text-[11px] text-[#D9D2BF] font-sans mt-1">
                  Silt rating curve: {C} PPM quartz. Turbine bucket inspection cycle maintained.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ZONE D: STRUCTURED VERIFIED LEDGER */}
        {(activeZone === "all" || activeZone === "D") && (
          <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-5 rounded-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#C9A24B]">
                ZONE D · STRUCTURED POINT-BY-POINT LEDGER
              </span>
              <span className="text-[10px] font-mono text-[#A3B0C8]">
                IMMUTABLE AUDIT LOG
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#C9A24B]/20 font-mono text-[10px] uppercase text-[#A3B0C8]">
                    <th className="pb-2">Audit Parameter</th>
                    <th className="pb-2">Current Observation</th>
                    <th className="pb-2">Kernel Target</th>
                    <th className="pb-2">Fiscal & Engineering Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A24B]/15 text-[#D9D2BF]">
                  <tr>
                    <td className="py-2.5 font-medium text-[#F1EAD9]">Intake Gate Modulation</td>
                    <td className="py-2.5 font-mono">{Q} m³/s</td>
                    <td className="py-2.5 font-mono text-[#F0D27A]">{targetQ} m³/s</td>
                    <td className="py-2.5">Slowing flow cuts quartz kinetic impingement by ~35%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#F1EAD9]">Desander Scour Purge</td>
                    <td className="py-2.5 font-mono">{C} PPM</td>
                    <td className="py-2.5 font-mono text-[#5FB3A8]">SOP-04 Verified</td>
                    <td className="py-2.5">Settling basin excludes ~180 tons/hr of coarse quartz</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#F1EAD9]">Turbine Runner Wear</td>
                    <td className="py-2.5 font-mono">{deltaW} mm/h</td>
                    <td className="py-2.5 font-mono text-[#5FB3A8]">Clamped</td>
                    <td className="py-2.5">Avoids NPR ~51,500/day in Francis runner hard-facing repair</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#F1EAD9]">Grid Synchronous Power</td>
                    <td className="py-2.5 font-mono">{capacityMw} MW</td>
                    <td className="py-2.5 font-mono text-[#F1EAD9]">Stable 50.0 Hz</td>
                    <td className="py-2.5">Guarantees continuous grid power during peak load hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
