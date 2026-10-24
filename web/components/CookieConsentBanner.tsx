"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("hydromesh_cookie_consent");
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // In case localStorage is blocked
    }
  }, []);

  const acknowledge = () => {
    try {
      localStorage.setItem("hydromesh_cookie_consent", "acknowledged");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 90,
        width: "360px",
        maxWidth: "92vw",
        background: "var(--color-surface-raised, #252B4A)",
        border: "1px solid var(--color-cloud-rim, #D4B94A)",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
        fontFamily: "var(--font-ui, sans-serif)",
        color: "var(--color-text-primary, #F4F6FC)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(212,185,74,0.15)", border: "1px solid #D4B94A", borderRadius: "3px", color: "#D4B94A", fontFamily: "var(--font-mono, monospace)" }}>SEC</span>
        <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--color-cloud-rim, #D4B94A)" }}>
          Essential Security & Preference Cookies
        </h4>
      </div>

      <p style={{ margin: "0 0 14px 0", fontSize: "11px", lineHeight: 1.6, color: "var(--color-text-secondary, #A6B0CF)" }}>
        We only use essential security cookies to keep your control room session safe and remember your display preferences. No ad trackers, no third-party data brokers, ever.
      </p>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={acknowledge}
          style={{
            flex: 1,
            background: "var(--color-cloud-rim, #D4B94A)",
            border: "none",
            borderRadius: "4px",
            padding: "8px",
            color: "#1A1010",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Acknowledge & Close
        </button>
        <Link
          href="/about"
          style={{
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid var(--color-border-default, #3A436D)",
            borderRadius: "4px",
            color: "var(--color-text-secondary, #A6B0CF)",
            textDecoration: "none",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
          }}
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
