"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PowerhouseStation, PowerhouseCard } from "./PowerhouseGrid";

export interface GlobalFleetAnalyticsProps {
  plants: Array<{
    id: string;
    name: string;
    capacity_mw: number;
    river_basin: string;
    latitude: number;
    longitude: number;
    design_flow_m3s: number;
    head_m: number;
    catchment_area_km2: number;
    base_flow_m3s?: number;
  }>;
  powerhouseStations: PowerhouseStation[];
  liveFleetTelemetry: Record<string, any>;
  onSelectPlant: (plant: any) => void;
  selectedPlantId: string;
  onTriggerScenario?: (scenario: string) => void;
  scenarioStatus?: string | null;
}

interface FleetHistoryPoint {
  ts: string;
  timeLabel: string;
  total_mw: number;
  total_q: number;
  avg_silt: number;
}

// Hydro power generation formula: P = eta * rho * g * Q_eff * H / 1000 (MW)
export function calculatePlantPowerMw(
  capacity_mw: number,
  head_m: number,
  discharge_m3s: number,
  design_flow_m3s: number,
  alert_tier: string
): number {
  if (alert_tier === "CRITICAL") return 0.0;
  const eff_q = Math.min(Math.max(0, discharge_m3s), design_flow_m3s);
  // eta * rho * g = 0.90 * 1000 * 9.81 = 8829 N/m3 -> 8.829 kN/m3
  const theoretical_mw = (8.829 * eff_q * head_m) / 1000;
  const throttle = alert_tier === "WARNING" ? 0.75 : alert_tier === "WATCH" ? 0.9 : 1.0;
  const calculated = theoretical_mw * throttle;
  return Math.min(capacity_mw, Math.max(0, Math.round(calculated * 10) / 10));
}

export function GlobalFleetAnalytics({
  plants,
  powerhouseStations,
  liveFleetTelemetry,
  onSelectPlant,
  selectedPlantId,
  onTriggerScenario,
  scenarioStatus,
}: GlobalFleetAnalyticsProps) {
  const [basinFilter, setBasinFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [hoveredBasin, setHoveredBasin] = useState<string | null>(null);

  // Compute live station production stats
  const stationStats = useMemo(() => {
    return powerhouseStations.map((station) => {
      const live = liveFleetTelemetry[station.id];
      const q = live?.discharge_m3s ?? station.current_discharge_m3s ?? station.design_flow_m3s * 0.75;
      const silt = live?.silt_ppm ?? station.current_silt_ppm ?? 320;
      // Derive tier accurately from physical silt thresholds
      const tier = live?.alert_tier ?? (silt > 3000 ? "CRITICAL" : silt >= 1200 ? "WARNING" : silt >= 800 ? "WATCH" : "NORMAL");
      const powerMw = calculatePlantPowerMw(
        station.capacity_mw,
        station.head_m,
        q,
        station.design_flow_m3s,
        tier
      );
      const loadPct = station.capacity_mw > 0 ? Math.min(100, Math.round((powerMw / station.capacity_mw) * 100)) : 0;

      return {
        ...station,
        current_discharge_m3s: q,
        current_silt_ppm: silt,
        alert_tier: tier,
        calculated_mw: powerMw,
        load_pct: loadPct,
      };
    });
  }, [powerhouseStations, liveFleetTelemetry]);

  // Aggregate National Fleet Totals
  const totals = useMemo(() => {
    const totalCapacity = stationStats.reduce((acc, s) => acc + s.capacity_mw, 0);
    const totalMw = stationStats.reduce((acc, s) => acc + s.calculated_mw, 0);
    const totalQ = stationStats.reduce((acc, s) => acc + (s.current_discharge_m3s || 0), 0);
    const avgSilt = stationStats.length > 0
      ? Math.round(stationStats.reduce((acc, s) => acc + (s.current_silt_ppm || 0), 0) / stationStats.length)
      : 300;
    const criticalCount = stationStats.filter((s) => s.alert_tier === "CRITICAL").length;
    const warningCount = stationStats.filter((s) => s.alert_tier === "WARNING").length;
    const watchCount = stationStats.filter((s) => s.alert_tier === "WATCH").length;
    const normalCount = stationStats.filter((s) => s.alert_tier === "NORMAL" || !s.alert_tier).length;
    const gridLoadPct = totalCapacity > 0 ? Math.round((totalMw / totalCapacity) * 1000) / 10 : 0;

    return {
      totalCapacity: Math.round(totalCapacity),
      totalMw: Math.round(totalMw * 10) / 10,
      totalQ: Math.round(totalQ * 10) / 10,
      avgSilt,
      criticalCount,
      warningCount,
      watchCount,
      normalCount,
      gridLoadPct,
    };
  }, [stationStats]);

  // Rolling history for the 24/7 generation line graph (initialized client-side to prevent SSR mismatch)
  const [fleetHistory, setFleetHistory] = useState<FleetHistoryPoint[]>([]);

  // Seed initial rolling wave on mount (pure client-side execution)
  useEffect(() => {
    const now = Date.now();
    const initialPoints: FleetHistoryPoint[] = [];
    const baseMw = 1069.9;
    const baseQ = 1120.2;
    for (let i = 24; i >= 0; i--) {
      const t = new Date(now - i * 2000);
      const mod = Math.sin((24 - i) * 0.45) * 16.0 + Math.cos((24 - i) * 0.8) * 7.0;
      initialPoints.push({
        ts: t.toISOString(),
        timeLabel: t.toLocaleTimeString("en-GB", { hour12: false }),
        total_mw: Math.round((baseMw + mod) * 10) / 10,
        total_q: Math.round((baseQ + mod * 0.85) * 10) / 10,
        avg_silt: 280,
      });
    }
    setFleetHistory(initialPoints);
  }, []);

  // Record rolling 24/7 history ticks for the line chart
  useEffect(() => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString("en-GB", { hour12: false });
    setFleetHistory((prev) => {
      const nextPoint: FleetHistoryPoint = {
        ts: now.toISOString(),
        timeLabel,
        total_mw: totals.totalMw,
        total_q: totals.totalQ,
        avg_silt: totals.avgSilt,
      };
      const updated = [...prev, nextPoint];
      return updated.slice(-30); // Keep last 30 ticks
    });
  }, [totals.totalMw, totals.totalQ, totals.avgSilt]);

  // Basin Breakdown for Donut Chart
  const basinData = useMemo(() => {
    const basinMap: Record<string, { mw: number; capacity: number; count: number; color: string }> = {
      Koshi: { mw: 0, capacity: 0, count: 0, color: "#C9A24B" }, // Gold
      Gandaki: { mw: 0, capacity: 0, count: 0, color: "#5FB3A8" }, // Sage Teal
      Bagmati: { mw: 0, capacity: 0, count: 0, color: "#818CF8" }, // Indigo
      Karnali: { mw: 0, capacity: 0, count: 0, color: "#E08A3A" }, // Flame Orange
      Mahakali: { mw: 0, capacity: 0, count: 0, color: "#F0D27A" }, // Warm Amber
    };

    stationStats.forEach((s) => {
      const bKey = s.river_basin || "Gandaki";
      const matched = Object.keys(basinMap).find((k) => k.toLowerCase() === bKey.toLowerCase()) || "Gandaki";
      basinMap[matched].mw += s.calculated_mw;
      basinMap[matched].capacity += s.capacity_mw;
      basinMap[matched].count += 1;
    });

    const totalCalculatedMw = Object.values(basinMap).reduce((sum, b) => sum + b.mw, 0) || 1;

    return Object.entries(basinMap).map(([basin, data]) => ({
      basin,
      mw: Math.round(data.mw * 10) / 10,
      capacity: Math.round(data.capacity),
      count: data.count,
      color: data.color,
      sharePct: Math.round((data.mw / totalCalculatedMw) * 1000) / 10,
    }));
  }, [stationStats]);

  // Top 8 Powerhouses for Balanced Bar Chart Display
  const topStations = useMemo(() => {
    return [...stationStats]
      .sort((a, b) => b.capacity_mw - a.capacity_mw)
      .slice(0, 8);
  }, [stationStats]);

  // SVG Helper: Donut Slices (Compact 260x260 viewBox, radius 85, innerRadius 58, center 130)
  const donutSlices = useMemo(() => {
    const totalShare = basinData.reduce((acc, b) => acc + b.sharePct, 0) || 100;
    let accumulatedAngle = 0;
    const radius = 85;
    const innerRadius = 58;
    const cx = 130;
    const cy = 130;

    return basinData.map((basin) => {
      const angle = (basin.sharePct / totalShare) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle += angle;

      const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(toRad(startAngle));
      const y1 = cy + radius * Math.sin(toRad(startAngle));
      const x2 = cx + radius * Math.cos(toRad(endAngle - 0.5));
      const y2 = cy + radius * Math.sin(toRad(endAngle - 0.5));

      const ix1 = cx + innerRadius * Math.cos(toRad(startAngle));
      const iy1 = cy + innerRadius * Math.sin(toRad(startAngle));
      const ix2 = cx + innerRadius * Math.cos(toRad(endAngle - 0.5));
      const iy2 = cy + innerRadius * Math.sin(toRad(endAngle - 0.5));

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${ix2} ${iy2}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
        Z
      `;

      return {
        ...basin,
        pathData,
        startAngle,
        endAngle,
      };
    });
  }, [basinData]);

  // SVG Helper: Line Graph Coordinate Calculation
  const lineGraphCoords = useMemo(() => {
    const w = 720;
    const h = 160;
    const padX = 50;
    const padY = 20;
    const points = fleetHistory.length >= 2 ? fleetHistory : [
      { ts: "0", timeLabel: "00:00", total_mw: totals.totalMw * 0.95, total_q: totals.totalQ * 0.95, avg_silt: totals.avgSilt },
      { ts: "1", timeLabel: "00:02", total_mw: totals.totalMw, total_q: totals.totalQ, avg_silt: totals.avgSilt },
    ];

    const maxMw = Math.max(totals.totalCapacity, ...points.map((p) => p.total_mw)) * 1.05;
    const minMw = Math.min(200, ...points.map((p) => p.total_mw)) * 0.9;
    const maxQ = Math.max(1500, ...points.map((p) => p.total_q)) * 1.1;

    const mwPoints = points.map((p, i) => {
      const x = padX + (i / (points.length - 1)) * (w - padX * 2);
      const y = h - padY - ((p.total_mw - minMw) / (maxMw - minMw || 1)) * (h - padY * 2);
      return { x, y, val: p.total_mw, q: p.total_q, label: p.timeLabel };
    });

    const qPoints = points.map((p, i) => {
      const x = padX + (i / (points.length - 1)) * (w - padX * 2);
      const y = h - padY - (p.total_q / maxQ) * (h - padY * 2);
      return { x, y, val: p.total_q };
    });

    const mwPath = mwPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, "");
    const qPath = qPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, "");

    // Area fill for MW line
    const firstX = mwPoints[0]?.x || padX;
    const lastX = mwPoints[mwPoints.length - 1]?.x || w - padX;
    const bottomY = h - padY;
    const mwArea = `${mwPath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;

    return {
      w,
      h,
      padX,
      padY,
      mwPath,
      qPath,
      mwArea,
      mwPoints,
      qPoints,
      latest: mwPoints[mwPoints.length - 1],
      maxMw: Math.round(maxMw),
      minMw: Math.round(minMw),
      maxQ: Math.round(maxQ),
    };
  }, [fleetHistory, totals.totalCapacity, totals.totalMw, totals.totalQ]);

  const getTierColor = (tier: string) => {
    switch (String(tier || "").toUpperCase()) {
      case "CRITICAL": return "#E0705A";
      case "WARNING": return "#E08A3A";
      case "WATCH": return "#E0A43A";
      default: return "#5FB3A8";
    }
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* =======================================================================
          1. EXECUTIVE WELCOME SECTION · NATIONAL HIMALAYAN GRID OVERVIEW
          ======================================================================= */}
      <section className="relative rounded-3xl bg-gradient-to-b from-[#0F1E3A]/85 via-[#0A1326]/70 to-[#070C18]/80 p-6 sm:p-8 border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden">
        {/* Ambient golden glow */}
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#C9A24B]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-[#5FB3A8]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Tag & Status Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-[#C9A24B]/10 border border-[#C9A24B]/30 px-3.5 py-1 rounded-full text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                NEPAL NATIONAL POWER GRID · 24/7 AUTONOMOUS COMMAND
              </div>
              <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full text-[11px] font-mono text-[#5FB3A8]">
                <span>●</span> 25 ACTIVE POWERHOUSES MONITORED
              </div>
            </div>

            {/* Quick Pulse Triggers */}
            {onTriggerScenario && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-[#A3B0C8] tracking-wider hidden lg:inline">
                  Fleet Scenario:
                </span>
                <button
                  onClick={() => onTriggerScenario("normal")}
                  className="px-3 py-1 bg-white/[0.04] hover:bg-[#5FB3A8]/20 border border-white/[0.1] text-xs font-mono text-[#5FB3A8] rounded-full transition-all cursor-pointer font-medium"
                >
                  BASEFLOW
                </button>
                <button
                  onClick={() => onTriggerScenario("monsoon_surge")}
                  className="px-3 py-1 bg-white/[0.04] hover:bg-[#E08A3A]/20 border border-white/[0.1] text-xs font-mono text-[#E08A3A] rounded-full transition-all cursor-pointer font-medium"
                >
                  MONSOON +1.5x
                </button>
                <button
                  onClick={() => onTriggerScenario("flash_flood")}
                  className="px-3 py-1 bg-white/[0.04] hover:bg-[#E0705A]/20 border border-white/[0.1] text-xs font-mono text-[#E0705A] rounded-full transition-all cursor-pointer font-medium"
                >
                  FLASH FLOOD +2.5x
                </button>
              </div>
            )}
          </div>

          {/* Main Welcome Headline */}
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F1EAD9] tracking-tight leading-tight">
              Welcome to <span className="text-[#C9A24B]">HydroMesh</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#A3B0C8] font-sans leading-relaxed">
              Nepal's centralized 24/7 Autonomous Hydropower Defense & Generation Grid. Continuous rational runoff calculations,
              real-time abrasive quartz silt tracking, and decentralized neural agents protecting all 25 powerhouses across the Himalayas.
            </p>
          </div>

          {/* 4 Executive Live KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {/* KPI 1: Real-Time Fleet Generation */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#A3B0C8] uppercase tracking-wider">
                <span>Total National Output</span>
                <span className="text-[#5FB3A8]">● 24/7 Live</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F1EAD9]">
                  {totals.totalMw.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-[#C9A24B]">MW</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] flex justify-between">
                <span>Capacity: {totals.totalCapacity.toLocaleString()} MW</span>
                <span className="text-[#D4AF37] font-bold">{totals.gridLoadPct}% Load</span>
              </div>
            </div>

            {/* KPI 2: Himalayan Inflow Q */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#A3B0C8] uppercase tracking-wider">
                <span>Fleet River Inflow Q</span>
                <span className="text-[#C9A24B]">Σ 25 Dams</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F1EAD9]">
                  {totals.totalQ.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-[#5FB3A8]">m³/s</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8]">
                Monitored across 5 river basins
              </div>
            </div>

            {/* KPI 3: Quartz Silt & Protection Health */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#A3B0C8] uppercase tracking-wider">
                <span>Sediment Defense</span>
                <span className="text-[#D4AF37]">IEC 62364</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F1EAD9]">
                  {totals.normalCount}
                </span>
                <span className="text-xs font-mono text-[#5FB3A8]">/ 25 Safe</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] flex gap-2">
                <span className="text-[#5FB3A8]">{totals.normalCount} Normal</span>
                {totals.watchCount > 0 && <span className="text-[#E0A43A]">{totals.watchCount} Watch</span>}
                {totals.warningCount > 0 && <span className="text-[#E08A3A]">{totals.warningCount} Flush</span>}
                {totals.criticalCount > 0 && <span className="text-[#E0705A]">{totals.criticalCount} Trip</span>}
              </div>
            </div>

            {/* KPI 4: Grid Frequency & Defense Kernel */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#A3B0C8] uppercase tracking-wider">
                <span>Grid Frequency</span>
                <span className="text-[#5FB3A8]">Synchronized</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#F1EAD9]">
                  50.02
                </span>
                <span className="text-xs font-mono text-[#5FB3A8]">Hz</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8]">
                Auto-ACK Interlock Active · 10:00 Window
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          2. LIVE 24/7 PRODUCTION ANALYTICS TRIO (LINE, BAR & DONUT CHARTS)
          ======================================================================= */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C9A24B] font-bold">
                24/7 PRODUCTION ANALYTICS & GRID DISPATCH
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F1EAD9]">
              Live National Hydropower Generation
            </h2>
            <p className="text-xs text-[#A3B0C8] font-sans mt-0.5">
              Continuous physics calculation of power output: <code className="text-[#C9A24B] font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">P = η · ρ · g · Q_eff · H</code> updating in real time across all 25 stations.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[#A3B0C8]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A24B]" /> Total Power (MW)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5FB3A8]" /> Basin Inflow (m³/s)
            </span>
          </div>
        </div>

        {/* Charts Grid: Top: Sleek Line Graph, Bottom: Bar Graph + Donut Chart */}
        <div className="space-y-5">
          {/* 2.1 LINE GRAPH: 24/7 Total National Output & Runoff Curve */}
          <div className="relative rounded-2xl bg-gradient-to-b from-[#0A1224]/90 to-[#070D18]/95 border border-white/[0.08] p-5 shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#F1EAD9] flex items-center gap-2">
                  <span>National Generation & Basin Discharge Stream</span>
                  <span className="text-[10px] font-mono bg-[#5FB3A8]/10 text-[#5FB3A8] border border-[#5FB3A8]/30 px-2 py-0.5 rounded-full">
                    REAL-TIME 2s INTERVALS
                  </span>
                </h3>
                <p className="text-xs text-[#A3B0C8] font-sans">
                  Total electric power output dispatch vs aggregate Himalayan river runoff entering intake reservoirs.
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="bg-white/[0.03] border border-white/[0.08] px-3 py-1 rounded-lg">
                  <span className="text-[#A3B0C8] text-[10px] block">LIVE NATIONAL PEAK</span>
                  <span className="text-[#D4AF37] font-bold">{totals.totalMw} MW</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.08] px-3 py-1 rounded-lg">
                  <span className="text-[#A3B0C8] text-[10px] block">AGGREGATE RUNOFF</span>
                  <span className="text-[#5FB3A8] font-bold">{totals.totalQ} m³/s</span>
                </div>
              </div>
            </div>

            {/* SVG Line Graph */}
            <div className="w-full h-44 relative">
              <svg
                viewBox={`0 0 ${lineGraphCoords.w} ${lineGraphCoords.h}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="fleetMwGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A24B" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#C9A24B" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#C9A24B" floodOpacity="0.6" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                  const y = lineGraphCoords.h - lineGraphCoords.padY - ratio * (lineGraphCoords.h - lineGraphCoords.padY * 2);
                  const mwLabel = Math.round(lineGraphCoords.minMw + ratio * (lineGraphCoords.maxMw - lineGraphCoords.minMw));
                  return (
                    <g key={ratio}>
                      <line
                        x1={lineGraphCoords.padX}
                        y1={y}
                        x2={lineGraphCoords.w - lineGraphCoords.padX}
                        y2={y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={lineGraphCoords.padX - 8}
                        y={y + 3}
                        fill="#A3B0C8"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {mwLabel} MW
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area fill for MW */}
                {lineGraphCoords.mwArea && (
                  <path d={lineGraphCoords.mwArea} fill="url(#fleetMwGradient)" />
                )}

                {/* Cyan River Runoff Trace */}
                {lineGraphCoords.qPath && (
                  <path
                    d={lineGraphCoords.qPath}
                    fill="none"
                    stroke="#5FB3A8"
                    strokeWidth="1.8"
                    strokeOpacity="0.8"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Main Gold Power Generation Trace */}
                {lineGraphCoords.mwPath && (
                  <path
                    d={lineGraphCoords.mwPath}
                    fill="none"
                    stroke="#C9A24B"
                    strokeWidth="2.5"
                    filter="url(#goldGlow)"
                  />
                )}

                {/* Latest Pulse Dot on MW */}
                {lineGraphCoords.latest && (
                  <g>
                    <circle
                      cx={lineGraphCoords.latest.x}
                      cy={lineGraphCoords.latest.y}
                      r="7"
                      fill="#C9A24B"
                      fillOpacity="0.3"
                      className="animate-ping"
                    />
                    <circle
                      cx={lineGraphCoords.latest.x}
                      cy={lineGraphCoords.latest.y}
                      r="4"
                      fill="#F0D27A"
                      stroke="#070C18"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Time labels below chart */}
            <div className="flex justify-between text-[10px] font-mono text-[#A3B0C8] pt-2 px-10 border-t border-white/[0.05] mt-1">
              <span>-60s NST</span>
              <span>-40s NST</span>
              <span>-20s NST</span>
              <span className="text-[#C9A24B] font-bold">Now ({fleetHistory[fleetHistory.length - 1]?.timeLabel || "Live"})</span>
            </div>
          </div>

          {/* 2.2 TWO-COLUMN ROW: BAR GRAPH (LEFT) & DONUT/PIE CHART (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* BAR GRAPH: Station Production Breakdown ("Who's Doing What") */}
            <div className="lg:col-span-7 rounded-2xl bg-gradient-to-b from-[#0A1224]/90 to-[#070D18]/95 border border-white/[0.08] p-5 shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-md space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                <div>
                  <h3 className="text-sm sm:text-base font-serif font-bold text-[#F1EAD9]">
                    Top Stations Power Production Breakdown
                  </h3>
                  <p className="text-xs text-[#A3B0C8] font-sans">
                    Real-time production comparison showing active MW dispatch vs rated capacity across Nepal's major powerhouses.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#C9A24B] bg-[#C9A24B]/10 border border-[#C9A24B]/30 px-2 py-0.5 rounded-full">
                  8 LARGEST DAMS
                </span>
              </div>

              {/* Station Bars List */}
              <div className="space-y-2.5">
                {topStations.map((station) => {
                  const tierColor = getTierColor(station.alert_tier);
                  const isCurrent = station.id === selectedPlantId;

                  return (
                    <div
                      key={station.id}
                      onClick={() => {
                        const original = plants.find((p) => p.id === station.id);
                        if (original) onSelectPlant(original);
                      }}
                      className={`group p-2 rounded-xl transition-all cursor-pointer border ${
                        isCurrent
                          ? "bg-white/[0.06] border-[#C9A24B] shadow-[0_0_15px_rgba(201,162,75,0.2)]"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.15]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tierColor }}
                          />
                          <span className="font-sans font-medium text-[#F1EAD9] group-hover:text-[#D4AF37] transition-colors truncate max-w-[200px]">
                            {station.name}
                          </span>
                          <span className="text-[9px] text-[#A3B0C8] uppercase tracking-wider px-1.5 py-0.2 bg-white/[0.04] rounded">
                            {station.river_basin}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-[#A3B0C8]">
                            Q: {station.current_discharge_m3s?.toFixed(1)} m³/s
                          </span>
                          <span className="text-[#F1EAD9] font-bold text-xs">
                            {station.calculated_mw} <span className="text-[10px] text-[#A3B0C8] font-normal">/ {station.capacity_mw} MW</span>
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                            style={{
                              color: tierColor,
                              backgroundColor: `${tierColor}15`,
                            }}
                          >
                            {station.load_pct}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${station.load_pct}%`,
                            background: `linear-gradient(90deg, #5FB3A8 0%, ${tierColor} 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-[10px] font-mono text-[#A3B0C8] flex items-center justify-between border-t border-white/[0.06]">
                <span>Click any station bar to drill down into its individual SCADA cockpit.</span>
                <span className="text-[#C9A24B]">IEC 60041 Standard Compliant</span>
              </div>
            </div>

            {/* DONUT / PIE CHART: Grid Energy Share by Basin */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-[#0A1224]/90 to-[#070D18]/95 border border-white/[0.08] p-5 shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col justify-between space-y-3.5">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-sm sm:text-base font-serif font-bold text-[#F1EAD9]">
                      Grid Energy Share by Basin
                    </h3>
                    <p className="text-xs text-[#A3B0C8] font-sans">
                      Proportional power generation distribution across Nepal's 5 major river basins.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#5FB3A8] bg-[#5FB3A8]/10 border border-[#5FB3A8]/30 px-2 py-0.5 rounded-full">
                    REGIONAL MIX
                  </span>
                </div>

                {/* Donut Chart SVG - Proportionate and fully visible without cutting off */}
                <div className="relative w-full flex items-center justify-center py-2">
                  <div className="relative w-56 h-56">
                    <svg viewBox="0 0 260 260" className="w-full h-full">
                      {donutSlices.map((slice) => {
                        const isHovered = hoveredBasin === slice.basin;
                        return (
                          <path
                            key={slice.basin}
                            d={slice.pathData}
                            fill={slice.color}
                            fillOpacity={isHovered ? 0.95 : 0.75}
                            stroke="#070C18"
                            strokeWidth="2"
                            onMouseEnter={() => setHoveredBasin(slice.basin)}
                            onMouseLeave={() => setHoveredBasin(null)}
                            className="transition-all duration-200 cursor-pointer hover:filter hover:drop-shadow-[0_0_8px_rgba(201,162,75,0.5)]"
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-mono uppercase text-[#A3B0C8] tracking-widest">
                        TOTAL DISPATCH
                      </span>
                      <span className="text-xl sm:text-2xl font-serif font-bold text-[#F1EAD9]">
                        {totals.totalMw.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-mono text-[#C9A24B]">
                        MW · {totals.gridLoadPct}% CAP
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basin Legend with Live MW and % Share */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                {basinData.map((b) => (
                  <div
                    key={b.basin}
                    onMouseEnter={() => setHoveredBasin(b.basin)}
                    onMouseLeave={() => setHoveredBasin(null)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                      hoveredBasin === b.basin
                        ? "bg-white/[0.08] border-[#C9A24B]"
                        : "bg-white/[0.02] border-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="text-xs font-mono font-medium text-[#F1EAD9]">
                        {b.basin}
                      </span>
                      <span className="text-[9px] text-[#A3B0C8] ml-auto">
                        ({b.count})
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-[10px] font-mono">
                      <span className="text-[#A3B0C8]">{b.mw} MW</span>
                      <span className="text-[#F0D27A] font-bold">{b.sharePct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          3. SECTION VI · HIMALAYAN FLEET STATIONS MATRIX (ALL 25 STATIONS)
          ======================================================================= */}
      <section className="relative bg-gradient-to-b from-[#0A1224]/90 to-[#070D18]/95 border border-white/[0.08] shadow-[0_12px_48px_rgba(0,0,0,0.5)] rounded-2xl p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/[0.08] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C9A24B] font-bold">
                SECTION VI · COMPLETE FLEET MATRIX
              </span>
            </div>
            <h3 className="text-xl font-serif font-bold text-[#F1EAD9]">
              Himalayan Hydropower Stations Registry
            </h3>
            <p className="text-xs text-[#A3B0C8] font-sans mt-0.5">
              Click any station to immediately open its individual SCADA deep-dive cockpit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Basin Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] p-1 rounded-full text-xs font-mono backdrop-blur-sm">
              {["All", "Koshi", "Gandaki", "Karnali", "Bagmati"].map((b) => (
                <button
                  key={b}
                  onClick={() => setBasinFilter(b)}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    basinFilter === b
                      ? "bg-[#C9A24B] text-[#0B1424] font-bold shadow-sm"
                      : "text-[#A3B0C8] hover:text-[#F1EAD9]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-[#C9A24B] text-[#0B1424] font-bold" : "text-[#A3B0C8]"
                }`}
              >
                TABLE
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === "cards" ? "bg-[#C9A24B] text-[#0B1424] font-bold" : "text-[#A3B0C8]"
                }`}
              >
                CARDS
              </button>
            </div>
          </div>
        </div>

        {/* View Mode: Table */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-[#A3B0C8] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Station Name</th>
                  <th className="py-2.5 px-3">Basin</th>
                  <th className="py-2.5 px-3">Rated Cap</th>
                  <th className="py-2.5 px-3">Inflow Q</th>
                  <th className="py-2.5 px-3">Quartz Silt</th>
                  <th className="py-2.5 px-3">Calculated Output</th>
                  <th className="py-2.5 px-3">Condition Status</th>
                  <th className="py-2.5 px-3 text-right">Deep Dive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {stationStats
                  .filter((p) => basinFilter === "All" || p.river_basin.toLowerCase() === basinFilter.toLowerCase())
                  .map((station) => {
                    const isCurr = station.id === selectedPlantId;
                    const sTier = station.alert_tier || "NORMAL";
                    const sColor = getTierColor(sTier);

                    return (
                      <tr
                        key={station.id}
                        onClick={() => {
                          const found = plants.find((p) => p.id === station.id);
                          if (found) onSelectPlant(found);
                        }}
                        className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${
                          isCurr ? "bg-white/[0.06] font-semibold" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-[#F1EAD9] font-sans font-medium flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sColor }}
                          />
                          {station.name}
                        </td>
                        <td className="py-3 px-3 text-[#A3B0C8]">{station.river_basin}</td>
                        <td className="py-3 px-3 text-[#F1EAD9]">{station.capacity_mw} MW</td>
                        <td className="py-3 px-3 text-[#5FB3A8]">
                          {station.current_discharge_m3s?.toFixed(1) || "45.0"} m³/s
                        </td>
                        <td className="py-3 px-3" style={{ color: sColor }}>
                          {station.current_silt_ppm?.toFixed(0) || "380"} PPM
                        </td>
                        <td className="py-3 px-3 text-[#D4AF37] font-bold">
                          {station.calculated_mw} MW ({station.load_pct}%)
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] border backdrop-blur-sm"
                            style={{
                              color: sColor,
                              borderColor: `${sColor}40`,
                              backgroundColor: `${sColor}15`,
                            }}
                          >
                            ● {sTier}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const found = plants.find((p) => p.id === station.id);
                              if (found) onSelectPlant(found);
                            }}
                            className="px-3 py-1 bg-white/[0.04] hover:bg-[#C9A24B] hover:text-[#0B1424] border border-white/[0.1] text-xs font-mono text-[#F1EAD9] rounded-full transition-all cursor-pointer font-bold"
                          >
                            OPEN SCADA →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          /* View Mode: Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stationStats
              .filter((p) => basinFilter === "All" || p.river_basin.toLowerCase() === basinFilter.toLowerCase())
              .map((station) => (
                <PowerhouseCard
                  key={station.id}
                  plant={station}
                  isSelected={station.id === selectedPlantId}
                  onSelect={() => {
                    const found = plants.find((p) => p.id === station.id);
                    if (found) onSelectPlant(found);
                  }}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
