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

  const overallAlertTier = activeCriticalCount > 0 ? "CRITICAL" : activeWarningCount > 0 ? "WARNING" : "NORMAL";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(30, 34, 64, 0.95)",
        borderBottom: "1px solid var(--color-border-default, #3A436D)",
        backdropFilter: "blur(8px)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      {/* Left: Brand Logo & Mode Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Illuminated Amber Arch Window Icon */}
          <div
            style={{
              width: "22px",
              height: "26px",
              background: "#1A1010",
              border: "2px solid #7A5C48",
              borderRadius: "10px 10px 2px 2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "16px",
                background: "#F0C860",
                borderRadius: "6px 6px 1px 1px",
                boxShadow: "0 0 10px rgba(240, 200, 96, 0.8)",
              }}
            />
          </div>
          <div>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 800,
                fontSize: "16px",
                letterSpacing: "0.05em",
                color: "var(--color-text-primary, #F4F6FC)",
              }}
            >
              Hydro<span style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>Mesh</span>
            </span>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim, #6C7699)", letterSpacing: "0.08em" }}>
              HIMALAYAN RIVER GUARDIAN
            </div>
          </div>
        </Link>

        {/* Mode Switcher Pill */}
        <div
          style={{
            display: "flex",
            background: "var(--color-surface-sunken, #15172C)",
            border: "1px solid var(--color-border-subtle, #2E3557)",
            borderRadius: "4px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => onModeChange("global")}
            style={{
              background: mode === "global" ? "var(--color-cloud-rim, #D4B94A)" : "transparent",
              color: mode === "global" ? "#1A1010" : "var(--color-text-secondary, #A6B0CF)",
              border: "none",
              borderRadius: "3px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: mode === "global" ? 700 : 500,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            🌐 Global Fleet
          </button>
          <button
            onClick={() => onModeChange("individual")}
            style={{
              background: mode === "individual" ? "var(--color-cloud-rim, #D4B94A)" : "transparent",
              color: mode === "individual" ? "#1A1010" : "var(--color-text-secondary, #A6B0CF)",
              border: "none",
              borderRadius: "3px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: mode === "individual" ? 700 : 500,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            ⚡ My Plant
          </button>
        </div>
      </div>

      {/* Center: Real-Time Fleet Health Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "var(--color-surface-sunken, #15172C)",
          border: "1px solid var(--color-border-subtle, #2E3557)",
          borderRadius: "20px",
          padding: "4px 14px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background:
                overallAlertTier === "CRITICAL"
                  ? "var(--color-status-red, #E64C4C)"
                  : overallAlertTier === "WARNING"
                  ? "var(--color-status-yellow, #E5B83B)"
                  : "var(--color-status-green, #4CAF82)",
              boxShadow:
                overallAlertTier === "CRITICAL"
                  ? "0 0 8px rgba(230, 76, 76, 0.8)"
                  : "0 0 8px rgba(76, 175, 130, 0.8)",
            }}
          />
          <span style={{ fontWeight: 600, color: "var(--color-text-primary, #F4F6FC)" }}>
            {totalSites} Active Stations
          </span>
        </div>

        <span style={{ color: "var(--color-border-default, #3A436D)" }}>|</span>

        <span style={{ color: "var(--color-text-secondary, #A6B0CF)" }}>
          Satellite Link: <strong style={{ color: "#4CAF82" }}>ECMWF 9km [Connected · 820ms]</strong>
        </span>
      </div>

      {/* Right: Nepal Time Clock, Action Links & User Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Nepal Standard Time */}
        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "12px",
            color: "var(--color-text-amber, #F0C860)",
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
          title="Nepal Standard Time (UTC+5:45)"
        >
          ⏱️ {nstTime || "12:00:00 NST"}
        </div>

        {/* Quick Trigger Buttons */}
        {onOpenInspector && (
          <button
            onClick={onOpenInspector}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              color: "var(--color-text-secondary, #A6B0CF)",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            📋 Inspector
          </button>
        )}

        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              color: "var(--color-text-secondary, #A6B0CF)",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            ℹ️ Intro Tour
          </button>
        )}

        <Link
          href="/safety"
          style={{
            color: "var(--color-text-secondary, #A6B0CF)",
            textDecoration: "none",
            fontSize: "11px",
            border: "1px solid var(--color-border-subtle, #2E3557)",
            borderRadius: "4px",
            padding: "4px 8px",
          }}
        >
          🛡️ Rules R1-R11
        </Link>

        {/* User Identity Pill */}
        <button
          onClick={onOpenAuth}
          style={{
            background: "var(--color-surface-raised, #252B4A)",
            border: "1px solid var(--color-border-default, #3A436D)",
            borderRadius: "16px",
            padding: "4px 10px",
            color: userEmail ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-text-primary, #F4F6FC)",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>👤</span>
          <span>{userEmail || "Guest Operator"}</span>
          <span style={{ fontSize: "9px", color: "var(--color-text-dim, #6C7699)" }}>
            ({userRole === "guest" ? "Free Fleet" : "Pro 1-Site"})
          </span>
        </button>
      </div>
    </header>
  );
}
