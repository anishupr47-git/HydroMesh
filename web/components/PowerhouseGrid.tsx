"use client";

import React from "react";

export interface PowerhouseStation {
  id: string;
  name: string;
  capacity_mw: number;
  river_basin: string;
  latitude: number;
  longitude: number;
  head_m: number;
  design_flow_m3s: number;
  current_discharge_m3s?: number;
  current_silt_ppm?: number;
  alert_tier?: string;
}

interface PowerhouseGridProps {
  plants: PowerhouseStation[];
  selectedPlantId: string;
  onSelectPlant: (plant: PowerhouseStation) => void;
  basinFilter?: string;
}

export function PowerhouseCard({
  plant,
  isSelected,
  onSelect,
}: {
  plant: PowerhouseStation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const rawTier = String(plant.alert_tier || "NORMAL").toUpperCase();
  const alertTier = ["NORMAL", "WATCH", "WARNING", "CRITICAL"].includes(rawTier)
    ? rawTier
    : "NORMAL";
  const isCritical = alertTier === "CRITICAL";
  const isWarning = alertTier === "WARNING";

  const tierColors: Record<string, { bg: string; color: string; border: string }> = {
    NORMAL: { bg: "rgba(76, 175, 130, 0.14)", color: "#4CAF82", border: "rgba(76, 175, 130, 0.35)" },
    WATCH: { bg: "rgba(99, 102, 241, 0.14)", color: "#818CF8", border: "rgba(99, 102, 241, 0.35)" },
    WARNING: { bg: "rgba(229, 184, 59, 0.14)", color: "#E5B83B", border: "rgba(229, 184, 59, 0.4)" },
    CRITICAL: { bg: "rgba(230, 76, 76, 0.18)", color: "#E64C4C", border: "rgba(230, 76, 76, 0.5)" },
  };

  const tierStyle = tierColors[alertTier] || tierColors["NORMAL"];
  const discharge = plant.current_discharge_m3s ?? plant.design_flow_m3s * 0.75;
  const silt = plant.current_silt_ppm ?? 380;
  const basinDisplay = (plant.river_basin || "Nepal").toUpperCase();

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md ${
        isSelected
          ? "bg-gradient-to-b from-[#13274D] to-[#0D1A33] border-2 border-[#C9A24B] shadow-[0_0_24px_rgba(201,162,75,0.3)]"
          : "bg-gradient-to-b from-[#0F1D38]/60 to-[#0A1326]/80 border border-white/[0.08] hover:border-white/[0.2] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      }`}
    >
      {/* 1. Header with Basin & Condition Tier */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A24B]" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-[#A3B0C8] uppercase">
            {basinDisplay} BASIN
          </span>
        </div>

        <span
          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{
            background: tierStyle.bg,
            color: tierStyle.color,
            border: `1px solid ${tierStyle.border}`,
          }}
        >
          ● {alertTier}
        </span>
      </div>

      {/* 2. Plant Identification Header */}
      <div className="px-3.5 pt-3 pb-1">
        <h4 className="text-sm font-sans font-bold text-[#F1EAD9] truncate" title={plant.name}>
          {plant.name}
        </h4>
        <div className="text-[10px] font-mono text-[#A3B0C8] mt-0.5 truncate">
          GPS: {plant.latitude?.toFixed(2) ?? "27.85"}°N, {plant.longitude?.toFixed(2) ?? "86.14"}°E · {plant.head_m ?? 120}m Head
        </div>
      </div>

      {/* 3. Metrics Strip */}
      <div className="mx-3.5 my-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] grid grid-cols-3 gap-2 text-center font-mono">
        <div>
          <div className="text-[9px] text-[#A3B0C8] uppercase">Capacity</div>
          <div className="text-xs font-bold text-[#F1EAD9]">
            {plant.capacity_mw} <span className="text-[9px] font-normal text-[#A3B0C8]">MW</span>
          </div>
        </div>

        <div>
          <div className="text-[9px] text-[#A3B0C8] uppercase">Flow Q</div>
          <div className="text-xs font-bold text-[#5FB3A8]">
            {discharge.toFixed(1)} <span className="text-[9px] font-normal text-[#A3B0C8]">m³/s</span>
          </div>
        </div>

        <div>
          <div className="text-[9px] text-[#A3B0C8] uppercase">Silt PPM</div>
          <div
            className="text-xs font-bold"
            style={{ color: isCritical ? "#E64C4C" : isWarning ? "#E5B83B" : "#4CAF82" }}
          >
            {silt.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Active Bottom Glow Line */}
      {isSelected && (
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C9A24B] to-transparent shadow-[0_0_10px_#C9A24B]" />
      )}
    </div>
  );
}

export default function PowerhouseGrid({
  plants,
  selectedPlantId,
  onSelectPlant,
  basinFilter = "All",
}: PowerhouseGridProps) {
  // Show exactly 20 powerhouses
  const displayedPlants = plants
    .filter((p) => (basinFilter === "All" ? true : (p.river_basin || "").toLowerCase().includes(basinFilter.toLowerCase())))
    .slice(0, 20);

  return (
    <section style={{ marginBottom: "var(--space-6, 24px)" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(212,185,74,0.15)", border: "1px solid #D4B94A", borderRadius: "3px", color: "#D4B94A", fontFamily: "var(--font-mono, monospace)" }}>GRID</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
              The 20-Powerhouse Himalayan Grid (Official NEA Registry)
            </h3>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono, monospace)",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(212, 185, 74, 0.15)",
                color: "var(--color-cloud-rim, #D4B94A)",
                border: "1px solid rgba(212, 185, 74, 0.3)",
              }}
            >
              20 STATIONS ONLINE
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", marginTop: "2px" }}>
            Click any powerhouse block to focus live digital twin telemetry, multi-agent AI diagnostics, and revenue outlook.
          </div>
        </div>
      </div>

      {/* Responsive 5-Column Grid Matrix */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        {displayedPlants.map((plant) => (
          <PowerhouseCard
            key={plant.id}
            plant={plant}
            isSelected={plant.id === selectedPlantId}
            onSelect={() => onSelectPlant(plant)}
          />
        ))}
      </div>
    </section>
  );
}
