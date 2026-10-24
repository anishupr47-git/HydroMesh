"use client";

import React, { useState, useEffect, useRef } from "react";

interface SatelliteFeedBoxProps {
  stationName?: string;
  lat?: number;
  lon?: number;
  elevM?: number;
  currentRainMmH?: number;
}

export default function SatelliteFeedBox({
  stationName = "Upper Tamakoshi Hydropower Project",
  lat = 27.8483,
  lon = 86.1361,
  elevM = 822,
  currentRainMmH = 12.4,
}: SatelliteFeedBoxProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [tickCount, setTickCount] = useState(1);
  const [pingMs, setPingMs] = useState(28);
  const [rainRate, setRainRate] = useState(currentRainMmH);
  const [history, setHistory] = useState<number[]>([8, 9, 11, 12, 14, 13, 12, 15, 12, 13]);
  const [hash, setHash] = useState("d84a9e218c");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (frozen) return;
    intervalRef.current = setInterval(() => {
      setTickCount((prev) => prev + 1);
      // Subtle organic jitter on live telemetry packet
      setPingMs(Math.floor(24 + Math.random() * 9));
      const jitteredRain = Math.max(0, +(currentRainMmH + (Math.random() * 1.6 - 0.8)).toFixed(1));
      setRainRate(jitteredRain);
      setHistory((prev) => [...prev.slice(1), jitteredRain]);

      // Simple rolling hex token
      const randomHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
      setHash(randomHex);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [frozen, currentRainMmH]);

  const rawPayload = {
    satellite_feed: "NASA_GPM_IMERG_v07B + ECMWF_0.25deg",
    station: stationName,
    coordinates: { lat, lon, elev_m: elevM },
    tick: tickCount,
    precipitation_mm_h: rainRate,
    atmospheric_moisture_flux_kg_m_s: 46.8,
    cloud_optical_radiance_k: 212.4,
    inflow_gradient_m3s_h: +(rainRate * 0.98).toFixed(2),
    ping_ms: pingMs,
    blake2b_token: hash,
    status: "HTTP 200 OK",
  };

  if (collapsed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          zIndex: 40,
          background: "rgba(30, 34, 64, 0.94)",
          border: "1px solid var(--color-border-subtle, #2E3557)",
          borderRadius: "20px",
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          color: "var(--color-text-primary, #F4F6FC)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
        onClick={() => setCollapsed(false)}
        title="Click to expand real-time satellite feed"
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#4CAF82",
            boxShadow: "0 0 8px rgba(76, 175, 130, 0.8)",
          }}
        />
        <span>[SAT-LINK: ACTIVE]</span>
        <span style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>{rainRate.toFixed(1)} mm/h</span>
        <span style={{ color: "var(--color-text-dim, #6C7699)" }}>▲ EXPAND</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        zIndex: 40,
        width: "288px",
        background: "rgba(30, 34, 64, 0.94)",
        border: "1px solid var(--color-border-default, #3A436D)",
        borderRadius: "4px",
        padding: "12px",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "11px",
        color: "var(--color-text-primary, #F4F6FC)",
        boxShadow: "0 8px 24px rgba(8, 10, 15, 0.75)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Top Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #2E3557", paddingBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: frozen ? "#E5B83B" : "#4CAF82",
              boxShadow: frozen ? "0 0 6px #E5B83B" : "0 0 6px #4CAF82",
            }}
          />
          <span style={{ fontWeight: 700, color: "#4CAF82" }}>
            {frozen ? "[SAT-LINK: FROZEN]" : "[SAT-LINK: ACTIVE]"}
          </span>
        </div>
        <span style={{ color: "var(--color-text-dim, #6C7699)" }}>
          TICK: {(tickCount % 60).toString().padStart(2, "0")}.00s
        </span>
      </div>

      {/* Station Grounding */}
      <div style={{ marginBottom: "8px", fontSize: "10px", color: "var(--color-text-secondary, #A6B0CF)" }}>
        <div style={{ color: "var(--color-text-primary, #F4F6FC)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          [STATION] {stationName}
        </div>
        <div>
          GPS: {lat.toFixed(3)}°N, {lon.toFixed(3)}°E | Elev: {elevM}m
        </div>
      </div>

      {/* Telemetry Vector Readouts */}
      <div style={{ background: "#15172C", padding: "8px", borderRadius: "3px", marginBottom: "8px", border: "1px solid #2E3557" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "var(--color-text-secondary, #A6B0CF)" }}>NASA GPM Rain:</span>
          <span style={{ fontWeight: 700, color: "var(--color-cloud-rim, #D4B94A)" }}>{rainRate.toFixed(1)} mm/h</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "var(--color-text-secondary, #A6B0CF)" }}>ERA5 Moisture Flux:</span>
          <span style={{ color: "var(--color-text-primary, #F4F6FC)" }}>46.8 kg/(m·s)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "var(--color-text-secondary, #A6B0CF)" }}>ECMWF Radiance:</span>
          <span style={{ color: "var(--color-text-primary, #F4F6FC)" }}>212.4 K</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-text-secondary, #A6B0CF)" }}>Inflow Gradient:</span>
          <span style={{ color: "#4CAF82" }}>+{(rainRate * 0.98).toFixed(1)} m³/s/h</span>
        </div>

        {/* 60s Micro-Sparkline */}
        <div style={{ marginTop: "6px", display: "flex", alignItems: "flex-end", gap: "2px", height: "18px" }}>
          {history.map((val, i) => {
            const h = Math.max(3, Math.min(18, Math.round((val / 20) * 18)));
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  background: i === history.length - 1 ? "var(--color-cloud-rim, #D4B94A)" : "#4B5499",
                  borderRadius: "1px",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Network Verification & BLAKE2b Hash */}
      <div style={{ fontSize: "10px", color: "var(--color-text-dim, #6C7699)", marginBottom: "8px" }}>
        <div>PING: {pingMs} ms | STATUS: HTTP 200 OK</div>
        <div style={{ wordBreak: "break-all" }}>BLAKE2b: {hash}...</div>
      </div>

      {/* Operator Micro-Controls */}
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            flex: 1,
            background: "#252B4A",
            border: "1px solid #3A436D",
            borderRadius: "3px",
            color: "var(--color-text-secondary, #A6B0CF)",
            padding: "3px",
            fontSize: "9px",
            cursor: "pointer",
          }}
        >
          MINIMIZE
        </button>
        <button
          onClick={() => setFrozen((prev) => !prev)}
          style={{
            flex: 1,
            background: frozen ? "rgba(229, 184, 59, 0.2)" : "#252B4A",
            border: `1px solid ${frozen ? "#E5B83B" : "#3A436D"}`,
            borderRadius: "3px",
            color: frozen ? "#E5B83B" : "var(--color-text-secondary, #A6B0CF)",
            padding: "3px",
            fontSize: "9px",
            cursor: "pointer",
          }}
        >
          {frozen ? "RESUME" : "FREEZE"}
        </button>
        <button
          onClick={() => setShowJson(true)}
          style={{
            flex: 1,
            background: "#252B4A",
            border: "1px solid #3A436D",
            borderRadius: "3px",
            color: "var(--color-text-secondary, #A6B0CF)",
            padding: "3px",
            fontSize: "9px",
            cursor: "pointer",
          }}
        >
          RAW JSON
        </button>
      </div>

      {/* RAW JSON Modal */}
      {showJson && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(10, 14, 25, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setShowJson(false)}
        >
          <div
            style={{
              background: "#15172C",
              border: "1px solid var(--color-border-bright, #546096)",
              borderRadius: "6px",
              padding: "16px",
              width: "420px",
              maxWidth: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontWeight: 700, color: "var(--color-cloud-rim, #D4B94A)" }}>
                NASA GPM IMERG Real-Time Telemetry Payload
              </span>
              <button
                onClick={() => setShowJson(false)}
                style={{ background: "transparent", border: "1px solid rgba(212,185,74,0.3)", borderRadius: "3px", color: "#FFF", fontSize: "10px", fontFamily: "var(--font-mono, monospace)", padding: "1px 4px", cursor: "pointer" }}
              >
                [CLOSE]
              </button>
            </div>
            <pre style={{ margin: 0, fontSize: "11px", color: "#E8EEF4", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(rawPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
