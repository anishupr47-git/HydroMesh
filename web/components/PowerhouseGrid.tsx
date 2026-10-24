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
      className="interactive-telemetry-card"
      style={{
        position: "relative",
        background: isSelected ? "var(--color-surface-raised, #252B4A)" : "var(--color-surface, #1E2240)",
        border: `1px solid ${isSelected ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-border-default, #3A436D)"}`,
        borderRadius: "6px",
        padding: "0",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: isSelected
          ? "0 0 16px -2px rgba(212, 185, 74, 0.35), 0 8px 24px rgba(10, 13, 18, 0.7)"
          : "var(--shadow-card)",
        transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* 1. Architectural Gable Roof & Substation Bushings (SVG Header) */}
      <div
        style={{
          background: "var(--color-surface-sunken, #15172C)",
          borderBottom: "1px solid var(--color-border-subtle, #2E3557)",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Gable Roof Polygon & Hearth Window */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Powerhouse Architectural Silhouette */}
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            {/* Gable Roof */}
            <polygon points="14,1 27,9 27,21 1,21 1,9" fill="#353D50" stroke="#7A5C48" strokeWidth="1" />
            {/* Ridge Vent */}
            <line x1="10" y1="5" x2="18" y2="5" stroke="#D4B94A" strokeWidth="1.5" />
            {/* Control Room Arched Hearth Window */}
            <path
              d="M 11 14 Q 14 10 17 14 L 17 21 L 11 21 Z"
              fill={isCritical ? "#E64C4C" : "#F0C860"}
              filter={isCritical ? "drop-shadow(0 0 4px #E64C4C)" : "drop-shadow(0 0 4px #F0C860)"}
            />
          </svg>

          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              color: isSelected ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-text-secondary, #A6B0CF)",
              fontWeight: 700,
            }}
          >
            {basinDisplay} BASIN
          </span>
        </div>

        {/* Operational Status Badge */}
        <span
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "3px",
            background: tierStyle.bg,
            color: tierStyle.color,
            border: `1px solid ${tierStyle.border}`,
            letterSpacing: "0.5px",
          }}
        >
          {alertTier}
        </span>
      </div>

      {/* 2. Plant Identification Header */}
      <div style={{ padding: "10px 12px 6px 12px" }}>
        <h4
          style={{
            margin: "0 0 4px 0",
            fontSize: "13px",
            fontWeight: 700,
            color: isSelected ? "#FFFFFF" : "var(--color-text-primary, #F4F6FC)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={plant.name}
        >
          {plant.name}
        </h4>
        <div style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim, #6C7699)" }}>
          📍 {plant.latitude?.toFixed(2) ?? "27.85"}°N, {plant.longitude?.toFixed(2) ?? "86.14"}°E · {plant.head_m ?? 120}m Head
        </div>
      </div>

      {/* 3. Monospace Telemetry Metrics Strip */}
      <div
        style={{
          margin: "4px 12px 10px 12px",
          background: "var(--color-surface-sunken, #15172C)",
          border: "1px solid var(--color-border-subtle, #2E3557)",
          borderRadius: "4px",
          padding: "6px 8px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "4px",
          textAlign: "center",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <div>
          <div style={{ fontSize: "9px", color: "var(--color-text-dim, #6C7699)" }}>CAPACITY</div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
            {plant.capacity_mw} <span style={{ fontSize: "8px", fontWeight: 400 }}>MW</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: "9px", color: "var(--color-text-dim, #6C7699)" }}>FLOW Q</div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-waterfall, #FFFFFF)" }}>
            {discharge.toFixed(1)} <span style={{ fontSize: "8px", fontWeight: 400 }}>m³/s</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: "9px", color: "var(--color-text-dim, #6C7699)" }}>SILT PPM</div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: isCritical ? "#E64C4C" : isWarning ? "#E5B83B" : "#4CAF82",
            }}
          >
            {silt.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Selection Bottom Glow Strip */}
      {isSelected && (
        <div
          style={{
            height: "2px",
            width: "100%",
            background: "var(--color-cloud-rim, #D4B94A)",
            boxShadow: "0 0 8px #D4B94A",
          }}
        />
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
            <span style={{ fontSize: "16px" }}>⚡</span>
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
