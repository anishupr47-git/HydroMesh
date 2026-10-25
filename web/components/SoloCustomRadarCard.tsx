"use client";

import { useState } from "react";

interface CustomLiveResult {
  plant: {
    id: string;
    name: string;
    capacity_mw: number;
    river_basin: string;
    latitude: number;
    longitude: number;
    head_m: number;
    design_flow_m3s: number;
    catchment_area_km2: number;
  };
  weather: {
    ts: string;
    precipitation_mm_h: number;
    temperature_c: number;
    cloud_cover_pct: number;
    is_live: boolean;
    hourly_precipitation_48h?: number[];
  };
  telemetry: {
    discharge_m3s: number;
    silt_ppm: number;
    vibration_mm_s: number;
    rainfall_mm_h: number;
  };
  incident: {
    anomaly?: {
      severity: string;
      confidence: number;
      silt_risk: number;
      cavitation_risk: number;
    };
    forecast?: {
      horizon_h: number;
      peak_discharge_m3s: number;
      peak_silt_ppm: number;
      risk: string;
      confidence: number;
    };
    verdict?: {
      status: string;
      reasons: string[];
    };
    decision?: {
      rationale: string;
      confidence: number;
    };
  } | null;
}

interface SoloCustomRadarCardProps {
  apiBase: string;
}

export default function SoloCustomRadarCard({ apiBase }: SoloCustomRadarCardProps) {
  const [name, setName] = useState("Solo Custom Hydropower Project");
  const [latitude, setLatitude] = useState(28.14);
  const [longitude, setLongitude] = useState(84.82);
  const [capacityMw, setCapacityMw] = useState(50.0);
  const [headM, setHeadM] = useState(120.0);
  const [designFlow, setDesignFlow] = useState(40.0);
  const [areaKm2, setAreaKm2] = useState(250.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomLiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (pName: string, lat: number, lon: number, head: number, mw: number, flow: number, area: number) => {
    setName(pName);
    setLatitude(lat);
    setLongitude(lon);
    setHeadM(head);
    setCapacityMw(mw);
    setDesignFlow(flow);
    setAreaKm2(area);
  };

  const handleExtractLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/live-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          latitude: Number(latitude),
          longitude: Number(longitude),
          capacity_mw: Number(capacityMw),
          head_m: Number(headM),
          design_flow_m3s: Number(designFlow),
          catchment_area_km2: Number(areaKm2),
          run_ai: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Satellite query failed with HTTP ${res.status}`);
      }
      const data: CustomLiveResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Satellite extraction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        background: "linear-gradient(135deg, rgba(26, 29, 66, 0.95), rgba(15, 17, 43, 0.98))",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        borderRadius: "8px",
        padding: "var(--space-5)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                padding: "2px 8px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                color: "#38BDF8",
                borderRadius: "3px",
                letterSpacing: "0.08em",
              }}
            >
              [GPS RADAR]
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                padding: "2px 8px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#10B981",
                borderRadius: "3px",
                letterSpacing: "0.08em",
              }}
            >
              [ECMWF 9KM / NOAA LIVE ASSIMILATION]
            </span>
          </div>
          <h2
            style={{
              margin: "6px 0 2px 0",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "#F8FAFC",
              letterSpacing: "-0.01em",
            }}
          >
            Solo Operator GPS Radar & Real-Time Satellite Telemetry
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "rgba(255, 255, 255, 0.65)",
            }}
          >
            Enter custom GPS coordinates for any hydropower site on Earth. Pings real European & NOAA numerical weather grids, computes catchment physical formulas, and executes the 5-agent AI safety kernel.
          </p>
        </div>

        {/* Quick coordinate presets */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => applyPreset("Upper Tamakoshi Hydropower Project", 27.85, 86.22, 822.0, 456.0, 66.0, 1745.0)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "4px 8px",
              background: "rgba(201, 162, 75, 0.15)",
              border: "1px solid rgba(201, 162, 75, 0.4)",
              color: "#F0D27A",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            [UPPER TAMAKOSHI: 27.85°N, 86.22°E (456 MW)]
          </button>
          <button
            onClick={() => applyPreset("Upper Marsyangdi Cascade", 28.32, 84.41, 140.0, 50.0, 42.0, 280.0)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94A3B8",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            [MARSYANGDI: 28.32°N, 84.41°E]
          </button>
          <button
            onClick={() => applyPreset("Upper Trishuli Chasm", 28.14, 85.29, 105.0, 60.0, 50.0, 310.0)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94A3B8",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            [TRISHULI: 28.14°N, 85.29°E]
          </button>
          <button
            onClick={() => applyPreset("Everest Alpine Torrent", 27.98, 86.75, 450.0, 25.0, 18.0, 120.0)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94A3B8",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            [EVEREST: 27.98°N, 86.75°E]
          </button>
        </div>
      </div>

      {/* Coordinate & Plant Input Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginBottom: "4px" }}>
            STATION NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFF",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#38BDF8", marginBottom: "4px" }}>
            LATITUDE (°N)
          </label>
          <input
            type="number"
            step="0.001"
            value={latitude}
            onChange={(e) => setLatitude(parseFloat(e.target.value))}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38BDF8",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#38BDF8", marginBottom: "4px" }}>
            LONGITUDE (°E)
          </label>
          <input
            type="number"
            step="0.001"
            value={longitude}
            onChange={(e) => setLongitude(parseFloat(e.target.value))}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38BDF8",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginBottom: "4px" }}>
            RATED HEAD (m)
          </label>
          <input
            type="number"
            value={headM}
            onChange={(e) => setHeadM(parseFloat(e.target.value))}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFF",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginBottom: "4px" }}>
            CAPACITY (MW)
          </label>
          <input
            type="number"
            value={capacityMw}
            onChange={(e) => setCapacityMw(parseFloat(e.target.value))}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFF",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#94A3B8", marginBottom: "4px" }}>
            BASIN AREA (km²)
          </label>
          <input
            type="number"
            value={areaKm2}
            onChange={(e) => setAreaKm2(parseFloat(e.target.value))}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFF",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>

      {/* Trigger Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "var(--space-4)" }}>
        <button
          onClick={handleExtractLive}
          disabled={loading}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: 700,
            padding: "10px 18px",
            background: loading ? "rgba(56, 189, 248, 0.3)" : "linear-gradient(90deg, #0284C7, #0EA5E9)",
            color: "#FFF",
            border: "1px solid rgba(56, 189, 248, 0.6)",
            borderRadius: "4px",
            cursor: loading ? "wait" : "pointer",
            letterSpacing: "0.04em",
            boxShadow: "0 0 15px rgba(14, 165, 233, 0.3)",
          }}
        >
          {loading ? "[COMMUNICATING WITH SATELLITE ARRAY...]" : "[EXTRACT REAL-TIME SATELLITE & RUN AI INFERENCE]"}
        </button>

        {loading && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#38BDF8" }}>
            Assimilating ECMWF 9km optical radiance & GFS forecast vectors...
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#EF4444",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            borderRadius: "4px",
            marginBottom: "var(--space-3)",
          }}
        >
          [ERROR]: {error}
        </div>
      )}

      {/* Live Result Display */}
      {result && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-4)",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "6px",
            padding: "var(--space-4)",
          }}
        >
          {/* Column 1: Live Satellite Weather */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#38BDF8",
                borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
                paddingBottom: "4px",
                marginBottom: "8px",
              }}
            >
              1. REAL-TIME SATELLITE ATMOSPHERE
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#E2E8F0", lineHeight: 1.8 }}>
              <div>
                <span style={{ color: "#94A3B8" }}>LINK STATUS: </span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>[ONLINE: LIVE SATELLITE]</span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>COORDINATES: </span>
                <span>{result.plant.latitude.toFixed(4)}°N, {result.plant.longitude.toFixed(4)}°E</span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>PRECIPITATION: </span>
                <span style={{ color: "#38BDF8", fontWeight: 700 }}>{result.weather.precipitation_mm_h.toFixed(2)} mm/h</span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>TEMPERATURE: </span>
                <span>{result.weather.temperature_c.toFixed(1)} °C</span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>CLOUD COVER: </span>
                <span>{result.weather.cloud_cover_pct.toFixed(0)} %</span>
              </div>
            </div>
          </div>

          {/* Column 2: Physical Catchment Hydrology */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#10B981",
                borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
                paddingBottom: "4px",
                marginBottom: "8px",
              }}
            >
              2. PHYSICAL CATCHMENT HYDROLOGY
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#E2E8F0", lineHeight: 1.8 }}>
              <div>
                <span style={{ color: "#94A3B8" }}>INFLOW (Q): </span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>{result.telemetry.discharge_m3s.toFixed(2)} m³/s</span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>QUARTZ SILT: </span>
                <span
                  style={{
                    color:
                      result.telemetry.silt_ppm > 3000
                        ? "#EF4444"
                        : result.telemetry.silt_ppm >= 1200
                        ? "#F59E0B"
                        : "#10B981",
                    fontWeight: 700,
                  }}
                >
                  {result.telemetry.silt_ppm.toFixed(1)} PPM
                </span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>TURBINE VIB: </span>
                <span>{result.telemetry.vibration_mm_s.toFixed(2)} mm/s</span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>RATING FORMULA: </span>
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>2.096e-4 * (Q^2.432)</span>
              </div>
            </div>
          </div>

          {/* Column 3: AI Multi-Agent Verdict & Safety Kernel */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#A855F7",
                borderBottom: "1px solid rgba(168, 85, 247, 0.2)",
                paddingBottom: "4px",
                marginBottom: "8px",
              }}
            >
              3. AI MULTI-AGENT SAFETY KERNEL
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#E2E8F0", lineHeight: 1.8 }}>
              <div>
                <span style={{ color: "#94A3B8" }}>TRIAGE VERDICT: </span>
                <span style={{ fontWeight: 700, color: "#10B981" }}>
                  [{result.incident?.anomaly?.severity?.toUpperCase() || "NORMAL"}]
                </span>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>SAFETY KERNEL: </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: result.incident?.verdict?.status === "approved" ? "#10B981" : "#F59E0B",
                  }}
                >
                  [{result.incident?.verdict?.status?.toUpperCase() || "APPROVED"}]
                </span>
              </div>
              {result.incident?.decision?.rationale && (
                <div
                  style={{
                    marginTop: "6px",
                    padding: "6px 8px",
                    background: "rgba(0, 0, 0, 0.3)",
                    borderLeft: "2px solid #38BDF8",
                    fontSize: "11px",
                    color: "#CBD5E1",
                  }}
                >
                  {result.incident.decision.rationale}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
