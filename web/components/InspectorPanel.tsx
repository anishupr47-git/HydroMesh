"use client";

import React, { useState } from "react";

interface TelemetryData {
  discharge_m3s: number;
  silt_ppm: number;
  alert_tier: string;
  runner_wear_pct: number;
  active_decision: string;
}

interface InspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plantName: string;
  telemetry: TelemetryData;
  tempC?: number;
  rainfallMmH?: number;
}

export default function InspectorPanel({
  isOpen,
  onClose,
  plantName,
  telemetry,
  tempC = 14.2,
  rainfallMmH = 12.4,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"telemetry" | "sop" | "audit">("telemetry");

  if (!isOpen) return null;

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "360px",
        maxWidth: "85vw",
        height: "100vh",
        background: "rgba(21, 23, 44, 0.98)",
        borderRight: "1px solid var(--color-border-bright, #546096)",
        boxShadow: "10px 0 30px rgba(0,0,0,0.7)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(12px)",
        fontFamily: "var(--font-ui, sans-serif)",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--color-border-default, #3A436D)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--color-surface, #1E2240)",
        }}
      >
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
            [SCADA] Telemetry & SOP Inspector
          </div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-cloud-rim, #D4B94A)" }}>
            {plantName}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid rgba(212,185,74,0.3)",
            borderRadius: "3px",
            color: "var(--color-text-secondary, #A6B0CF)",
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          [CLOSE]
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border-default, #3A436D)",
          background: "var(--color-surface-sunken, #15172C)",
        }}
      >
        {[
          { key: "telemetry", label: "1. Telemetry" },
          { key: "sop", label: "2. Active SOP" },
          { key: "audit", label: "3. Agent Log" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              flex: 1,
              padding: "10px 4px",
              background: activeTab === tab.key ? "var(--color-surface, #1E2240)" : "transparent",
              color: activeTab === tab.key ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-text-secondary, #A6B0CF)",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--color-cloud-rim, #D4B94A)" : "2px solid transparent",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {activeTab === "telemetry" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px" }}>
            <div style={{ background: "var(--color-surface, #1E2240)", padding: "12px", borderRadius: "6px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim, #6C7699)" }}>ACTIVE DISCHARGE Q</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-waterfall, #FFFFFF)" }}>
                {telemetry.discharge_m3s.toFixed(2)} m³/s
              </div>
            </div>

            <div style={{ background: "var(--color-surface, #1E2240)", padding: "12px", borderRadius: "6px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim, #6C7699)" }}>QUARTZ SILT CONCENTRATION</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-cloud-rim, #D4B94A)" }}>
                {telemetry.silt_ppm.toFixed(1)} PPM
              </div>
            </div>

            <div style={{ background: "var(--color-surface, #1E2240)", padding: "12px", borderRadius: "6px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim, #6C7699)" }}>TEMPERATURE & PRECIPITATION</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary, #F4F6FC)" }}>
                {tempC.toFixed(1)}°C · {rainfallMmH.toFixed(1)} mm/h
              </div>
            </div>

            <div style={{ background: "var(--color-surface, #1E2240)", padding: "12px", borderRadius: "6px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim, #6C7699)" }}>TURBINE RUNNER ABRASION</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#4CAF82" }}>
                {(telemetry.runner_wear_pct * 100).toFixed(3)}% (IEC 62364 Normal)
              </div>
            </div>
          </div>
        )}

        {activeTab === "sop" && (
          <div style={{ fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", lineHeight: 1.6 }}>
            <div
              style={{
                background: "rgba(212, 185, 74, 0.1)",
                border: "1px solid rgba(212, 185, 74, 0.3)",
                borderRadius: "4px",
                padding: "8px 12px",
                marginBottom: "12px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "11px",
              }}
            >
              [SHA-256 SECURED] HASH: <strong>88c4b1e94a02f78b</strong> (Verified)
            </div>

            <h4 style={{ margin: "0 0 6px 0", color: "var(--color-text-primary, #F4F6FC)", fontSize: "13px" }}>
              SOP-04: High Sediment Desander Flushing Protocol
            </h4>
            <p style={{ margin: "0 0 10px 0" }}>
              <strong>Condition:</strong> Silt Concentration exceeds 1,200 PPM for ≥ 3 consecutive readings.
            </p>
            <p style={{ margin: "0 0 10px 0" }}>
              <strong>Mandatory Actuation:</strong>
              <br />
              1. Modulate intake sluice gate to throttle river inflow.
              <br />
              2. Open Desander Basin Scour Gate #1 (Flow target: 8.5 m³/s).
              <br />
              3. Maintain flush for 45 minutes or until quartz silt drops below 1,000 PPM.
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-dim, #6C7699)" }}>
              Authority: National Electricity Authority (NEA) Standard Operating Procedure 2024-ROR-SED.
            </p>
          </div>
        )}

        {activeTab === "audit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "var(--font-mono, monospace)", fontSize: "11px" }}>
            {[
              { time: "T-00:04", agent: "TriageAgent", text: "Ingested live satellite weather vector; baseline stable." },
              { time: "T-00:03", agent: "PredictiveAgent", text: "Forecast curve indicates monsoon crest arriving in 2.8h." },
              { time: "T-00:02", agent: "SOPRAGMemory", text: "Retrieved verified SOP-04 (SHA-256: 88c4b1...)." },
              { time: "T-00:01", agent: "DispatchAgent", text: "Generated advisory intake modulation to 45 m³/s (advisory=True)." },
              { time: "T-NOW", agent: "SafetyKernel", text: "Rules R1-R11 verified: Environmental floor maintained." },
            ].map((ev, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-surface, #1E2240)",
                  borderLeft: "3px solid var(--color-cloud-rim, #D4B94A)",
                  padding: "8px 10px",
                  borderRadius: "0 4px 4px 0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-dim, #6C7699)", marginBottom: "2px" }}>
                  <span style={{ color: "var(--color-text-amber, #F0C860)", fontWeight: 700 }}>{ev.agent}</span>
                  <span>{ev.time}</span>
                </div>
                <div style={{ color: "var(--color-text-primary, #F4F6FC)" }}>{ev.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
