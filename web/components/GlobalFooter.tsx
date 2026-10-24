"use client";

import React from "react";
import Link from "next/link";

export default function GlobalFooter() {
  return (
    <footer
      style={{
        background: "var(--color-surface, #1E2240)",
        borderTop: "1px solid var(--color-border-default, #3A436D)",
        color: "var(--color-text-secondary, #A6B0CF)",
        fontFamily: "var(--font-ui, sans-serif)",
        padding: "48px 24px 24px 24px",
        marginTop: "auto",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "36px",
          marginBottom: "40px",
        }}
      >
        {/* Column 1: Brand, Mission & System Health */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div
              style={{
                width: "16px",
                height: "20px",
                background: "#1A1010",
                border: "2px solid #7A5C48",
                borderRadius: "8px 8px 1px 1px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "12px",
                  background: "#F0C860",
                  borderRadius: "4px 4px 1px 1px",
                  boxShadow: "0 0 8px rgba(240, 200, 96, 0.8)",
                }}
              />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text-primary, #F4F6FC)", letterSpacing: "0.04em" }}>
              Hydro<span style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>Mesh</span>
            </span>
          </div>

          <p style={{ margin: "0 0 16px 0", fontSize: "12px", lineHeight: 1.6, color: "var(--color-text-secondary, #A6B0CF)" }}>
            Autonomous Spatio-Temporal Digital Twin & Early Warning Sentinel for Himalayan Run-of-River Hydropower. Couples deep-learning forecasting with operational economics.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--color-surface-sunken, #15172C)",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4CAF82", boxShadow: "0 0 6px #4CAF82" }} />
            <span style={{ color: "#4CAF82", fontWeight: 700 }}>All Systems Operational</span>
            <span style={{ color: "var(--color-text-dim, #6C7699)" }}>· ECMWF 9km</span>
          </div>
        </div>

        {/* Column 2: SCADA Operations & Telemetry */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            SCADA Fleet & Telemetry
          </h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "12px", lineHeight: 2 }}>
            <li>
              <Link href="/demo" style={{ color: "inherit", textDecoration: "none" }}>
                → 20-Powerhouse Fleet Overview
              </Link>
            </li>
            <li>
              <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                → FastAPI Interactive Swagger API (/docs)
              </a>
            </li>
            <li>
              <Link href="/safety" style={{ color: "inherit", textDecoration: "none" }}>
                → SOP RAG Procedural Memory (SHA-256)
              </Link>
            </li>
            <li>
              <Link href="/evidence" style={{ color: "inherit", textDecoration: "none" }}>
                → Hydraulic Digital Twin Validation Evidence
              </Link>
            </li>
            <li>
              <a href="http://127.0.0.1:8000/api/health" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                → Real-Time Health Check (/api/health)
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Trust, Governance & Legal Protection */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Trust & Statutory Protection
          </h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "12px", lineHeight: 2 }}>
            <li>
              <span style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>✓ Advisory-Only Invariant (advisory: True)</span>
            </li>
            <li>
              <span>✓ Fail-Closed Safety Kernel (R1-R11)</span>
            </li>
            <li>
              <span>✓ Zero Commercial Tracking & No Ad Cookies</span>
            </li>
            <li>
              <span>✓ Coarsened Coordinate Privacy (0.1° Grid)</span>
            </li>
            <li>
              <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>
                → Complete Non-Liability Terms & Ethics
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Field Dispatch & Regulatory Information */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Field Dispatch & Regulatory Info
          </h4>
          <div
            style={{
              background: "var(--color-surface-sunken, #15172C)",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              borderRadius: "4px",
              padding: "12px",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1.8,
            }}
          >
            <div>
              <span style={{ color: "var(--color-text-dim, #6C7699)" }}>OPERATOR:</span> Himalayan Hydro Consortium
            </div>
            <div>
              <span style={{ color: "var(--color-text-dim, #6C7699)" }}>DISPATCH:</span> +977-1-4200000 / VHF Ch 16
            </div>
            <div>
              <span style={{ color: "var(--color-text-dim, #6C7699)" }}>HQ:</span> Kathmandu & Koshi River Basin
            </div>
            <div>
              <span style={{ color: "var(--color-text-dim, #6C7699)" }}>REGULATORY:</span> DOED / NEA Permit #2026-ROR
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Micro-Bar */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          paddingTop: "20px",
          borderTop: "1px solid var(--color-border-subtle, #2E3557)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "11px",
          color: "var(--color-text-dim, #6C7699)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <div>
          © 2026 HydroMesh. Open-source under MIT / Apache-2.0. Built for Himalayan Energy Resilience.
        </div>
        <div style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>
          Advisory DSS: Human operator authorization required before any valve or gate movement.
        </div>
        <div>
          Release v0.4.0 (Sprint 5) · SOP Manifest SHA: <strong>88c4b1...</strong>
        </div>
      </div>
    </footer>
  );
}
