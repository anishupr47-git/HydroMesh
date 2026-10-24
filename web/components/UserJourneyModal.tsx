"use client";

import React, { useState, useEffect } from "react";

export type JourneyPhase = "splash" | "auth" | "intro" | "completed";

interface UserJourneyModalProps {
  forceOpenPhase?: JourneyPhase | null;
  onClose: () => void;
  onGuestLogin?: () => void;
}

export default function UserJourneyModal({
  forceOpenPhase = null,
  onClose,
  onGuestLogin,
}: UserJourneyModalProps) {
  const [phase, setPhase] = useState<JourneyPhase>("splash");
  const [typedTitle, setTypedTitle] = useState("");
  const [typedSubtitle, setTypedSubtitle] = useState("");
  const [stepConsent, setStepConsent] = useState(false);
  const [stepPermissions, setStepPermissions] = useState(true);
  const [tutorialCardIdx, setTutorialCardIdx] = useState(0);

  const FULL_TITLE = "WELCOME TO HYDROMESH";
  const FULL_SUBTITLE = "AUTONOMOUS HIMALAYAN RUN-OF-RIVER GUARDIAN";

  // Check initial state from prop or localStorage
  useEffect(() => {
    if (forceOpenPhase) {
      setPhase(forceOpenPhase);
      return;
    }

    try {
      const dismissed = localStorage.getItem("hydromesh_onboarding_dismissed");
      if (dismissed === "true") {
        setPhase("completed");
      } else {
        setPhase("splash");
      }
    } catch {
      setPhase("completed");
    }
  }, [forceOpenPhase]);

  // Phase 1 Typewriter Effect
  useEffect(() => {
    if (phase !== "splash") return;

    let charIdx = 0;
    const titleInterval = setInterval(() => {
      if (charIdx <= FULL_TITLE.length) {
        setTypedTitle(FULL_TITLE.slice(0, charIdx));
        charIdx++;
      } else {
        clearInterval(titleInterval);

        // Subtitle typewriter
        let subIdx = 0;
        const subInterval = setInterval(() => {
          if (subIdx <= FULL_SUBTITLE.length) {
            setTypedSubtitle(FULL_SUBTITLE.slice(0, subIdx));
            subIdx++;
          } else {
            clearInterval(subInterval);
            // Auto transition to auth after 1.2s hold delay
            setTimeout(() => {
              setPhase("auth");
            }, 1200);
          }
        }, 40);
      }
    }, 55);

    return () => clearInterval(titleInterval);
  }, [phase]);

  const finishJourney = () => {
    try {
      localStorage.setItem("hydromesh_onboarding_dismissed", "true");
    } catch {}
    setPhase("completed");
    onClose();
  };

  if (phase === "completed") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(18, 20, 36, 0.94)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "var(--font-ui, sans-serif)",
        color: "var(--color-text-primary, #F4F6FC)",
      }}
    >
      {/* Top Right Skip Button */}
      <button
        onClick={finishJourney}
        style={{
          position: "absolute",
          top: "24px",
          right: "24px",
          background: "transparent",
          border: "1px solid var(--color-border-default, #3A436D)",
          borderRadius: "4px",
          padding: "6px 14px",
          color: "var(--color-text-secondary, #A6B0CF)",
          fontSize: "12px",
          fontFamily: "var(--font-mono, monospace)",
          cursor: "pointer",
        }}
      >
        Skip Intro →
      </button>

      {/* PHASE 1: SPLASH TYPEWRITER REVEAL */}
      {phase === "splash" && (
        <div style={{ textAlign: "center", maxWidth: "680px" }}>
          <div
            style={{
              width: "48px",
              height: "58px",
              background: "#1A1010",
              border: "3px solid #7A5C48",
              borderRadius: "24px 24px 4px 4px",
              margin: "0 auto 24px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "34px",
                background: "#F0C860",
                borderRadius: "12px 12px 2px 2px",
                boxShadow: "0 0 24px rgba(240, 200, 96, 0.9)",
              }}
            />
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 42px)",
              fontWeight: 800,
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.06em",
              color: "var(--color-highlight, #FFFFFF)",
              margin: "0 0 12px 0",
            }}
          >
            {typedTitle}
            <span
              style={{
                color: "var(--color-cloud-rim, #D4B94A)",
                display: "inline-block",
                animation: "window-glow 1s infinite",
              }}
            >
              _
            </span>
          </h1>

          <p
            style={{
              fontSize: "14px",
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--color-cloud-rim, #D4B94A)",
              letterSpacing: "0.15em",
              margin: 0,
            }}
          >
            {typedSubtitle}
          </p>
        </div>
      )}

      {/* PHASE 2: ONBOARDING, CONSENT & AUTH */}
      {phase === "auth" && (
        <div
          style={{
            background: "var(--color-surface, #1E2240)",
            border: "1px solid var(--color-border-bright, #546096)",
            borderRadius: "8px",
            padding: "32px",
            width: "520px",
            maxWidth: "92vw",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(212,185,74,0.15)", border: "1px solid #D4B94A", borderRadius: "3px", color: "#D4B94A", fontFamily: "var(--font-mono, monospace)" }}>SAFETY</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
              Step 1 & 2: Operational Terms & Access Gate
            </h2>
          </div>

          <div
            style={{
              background: "var(--color-surface-sunken, #15172C)",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              borderRadius: "6px",
              padding: "14px",
              fontSize: "12px",
              lineHeight: 1.6,
              color: "var(--color-text-secondary, #A6B0CF)",
              marginBottom: "20px",
            }}
          >
            <strong>Advisory DSS & Operational Safe Harbor:</strong>
            <br />
            HydroMesh is an AI digital twin for research and operational simulation. All proposed intake throttles and sediment flush commands require human signoff (<code style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>advisory: true</code>). Live weather is ingested from European ECMWF 9km satellite models.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={stepConsent}
                onChange={(e) => setStepConsent(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--color-cloud-rim, #D4B94A)" }}
              />
              <span>I understand and accept the operational safety invariants.</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={stepPermissions}
                onChange={(e) => setStepPermissions(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--color-cloud-rim, #D4B94A)" }}
              />
              <span>Grant permissions for WebSocket live telemetry & status cache.</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              disabled={!stepConsent}
              onClick={() => {
                if (onGuestLogin) onGuestLogin();
                setPhase("intro");
              }}
              style={{
                flex: 1,
                background: stepConsent ? "var(--color-cloud-rim, #D4B94A)" : "#3A436D",
                color: stepConsent ? "#1A1010" : "var(--color-text-dim, #6C7699)",
                border: "none",
                borderRadius: "4px",
                padding: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: stepConsent ? "pointer" : "not-allowed",
              }}
            >
              Enter System Onboarding →
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: PRODUCT INTRO & TUTORIAL (HOW TO USE) */}
      {phase === "intro" && (
        <div
          style={{
            background: "var(--color-surface, #1E2240)",
            border: "1px solid var(--color-border-bright, #546096)",
            borderRadius: "8px",
            padding: "32px",
            width: "560px",
            maxWidth: "92vw",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(212,185,74,0.15)", border: "1px solid #D4B94A", borderRadius: "3px", color: "#D4B94A", fontFamily: "var(--font-mono, monospace)" }}>TOUR</span>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
                Product Tour: How to Use HydroMesh
              </h2>
            </div>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-cloud-rim, #D4B94A)" }}>
              Step {tutorialCardIdx + 1} of 3
            </span>
          </div>

          {/* 3 Tutorial Cards */}
          <div
            style={{
              background: "var(--color-surface-sunken, #15172C)",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              borderRadius: "6px",
              padding: "20px",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            {tutorialCardIdx === 0 && (
              <div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--color-text-amber, #F0C860)" }}>
                  1. The 20-Powerhouse Himalayan Grid
                </h3>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--color-text-secondary, #A6B0CF)" }}>
                  Each block represents a real Nepal hydropower plant. Look for the illuminated arched hearth window—it blazes in warm amber during normal power generation and turns crimson when abrasive quartz sediment surges.
                </p>
              </div>
            )}

            {tutorialCardIdx === 1 && (
              <div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--color-text-amber, #F0C860)" }}>
                  2. Quartz Silt Influx & Turbine Health
                </h3>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--color-text-secondary, #A6B0CF)" }}>
                  Himalayan rivers carry razor-sharp quartz particles.
                  <br />
                  • <strong>&lt; 1,200 PPM (Green):</strong> Safe continuous generation.
                  <br />
                  • <strong>1,200 – 3,000 PPM (Yellow):</strong> Proactive sand flushing advisory.
                  <br />
                  • <strong>&gt; 3,000 PPM (Red):</strong> Intake gate throttled to avoid catastrophic runner abrasion.
                </p>
              </div>
            )}

            {tutorialCardIdx === 2 && (
              <div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--color-text-amber, #F0C860)" }}>
                  3. Multi-Agent AI & Energy Revenue Outlook
                </h3>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "var(--color-text-secondary, #A6B0CF)" }}>
                  5 autonomous AI agents analyze precipitation, verify SHA-256 SOPs, and produce plain-English advisories. Directly adjacent, the Energy Revenue Outlook Agent calculates expected generation (MWh) and avoided IEC 62364 refurbishment savings.
                </p>
              </div>
            )}

            {/* Stepper Dots */}
            <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  onClick={() => setTutorialCardIdx(idx)}
                  style={{
                    width: idx === tutorialCardIdx ? "20px" : "8px",
                    height: "6px",
                    borderRadius: "3px",
                    background: idx === tutorialCardIdx ? "var(--color-cloud-rim, #D4B94A)" : "#3A436D",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            {tutorialCardIdx > 0 && (
              <button
                onClick={() => setTutorialCardIdx((prev) => prev - 1)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-border-default, #3A436D)",
                  borderRadius: "4px",
                  padding: "10px 16px",
                  color: "var(--color-text-secondary, #A6B0CF)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}

            {tutorialCardIdx < 2 ? (
              <button
                onClick={() => setTutorialCardIdx((prev) => prev + 1)}
                style={{
                  flex: 1,
                  background: "var(--color-surface-raised, #252B4A)",
                  border: "1px solid var(--color-border-default, #3A436D)",
                  borderRadius: "4px",
                  padding: "10px 16px",
                  color: "var(--color-text-primary, #F4F6FC)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={finishJourney}
                style={{
                  flex: 1,
                  background: "var(--color-cloud-rim, #D4B94A)",
                  color: "#1A1010",
                  border: "none",
                  borderRadius: "4px",
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Continue to Dashboard →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
