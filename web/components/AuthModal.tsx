"use client";

import React, { useState } from "react";

interface AuthModalProps {
  onSuccess: (userData?: { role: string; email: string }) => void;
  onGuestAccess: () => void;
}

export default function AuthModal({ onSuccess, onGuestAccess }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Control Room Engineer");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Lantern is DIMMED OFF when password is being focused or contains characters
  const isLanternDimmed = passwordFocused || password.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and station access key.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    // Save auth token / state to localStorage
    setTimeout(() => {
      try {
        localStorage.setItem(
          "hydromesh_session",
          JSON.stringify({
            email,
            role,
            authenticated_at: new Date().toISOString(),
          })
        );
        localStorage.setItem("hydromesh_onboarding_dismissed", "true");
      } catch {}
      setLoading(false);
      onSuccess({ role, email });
    }, 600);
  };

  const handleGuest = () => {
    try {
      localStorage.setItem("hydromesh_onboarding_dismissed", "true");
    } catch {}
    onGuestAccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0B1424]/95 backdrop-blur-md overflow-y-auto transition-colors duration-500"
      style={{
        backgroundColor: isLanternDimmed
          ? "rgba(6, 10, 18, 0.98)"
          : "rgba(11, 20, 36, 0.94)",
      }}
    >
      {/* Background radial atmosphere responsive to lantern */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: isLanternDimmed
            ? "radial-gradient(circle at 75% 35%, rgba(20, 30, 45, 0.25) 0%, rgba(6, 10, 18, 0.98) 70%)"
            : "radial-gradient(circle at 75% 35%, rgba(240, 200, 96, 0.15) 0%, rgba(15, 29, 56, 0.35) 45%, rgba(11, 20, 36, 0.95) 90%)",
        }}
      />

      {/* Main Console Box */}
      <div className="relative z-10 w-full max-w-4xl bg-[#0F1A2E] border border-[#C9A24B] shadow-2xl pn grid grid-cols-1 md:grid-cols-12 overflow-hidden my-auto">
        {/* Perched Badge */}
        <div className="np">PHASE III · OPERATOR AUTHENTICATION</div>

        {/* LEFT COLUMN: Kinetic Francis Runner Wheel & Dynamo Shaft (5 cols) */}
        <div className="md:col-span-5 bg-[#0B1424] border-b md:border-b-0 md:border-r border-[#C9A24B]/30 p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
          {/* Subtle Chamber Ambient Lighting */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700"
            style={{
              background: isLanternDimmed
                ? "none"
                : "radial-gradient(circle at 50% 50%, rgba(240, 200, 96, 0.08) 0%, transparent 70%)",
            }}
          />

          <div className="w-full text-left">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#C9A24B] block">
              Hydraulic Coupling
            </span>
            <span className="text-sm font-serif font-semibold text-[#F1EAD9]">
              Francis Runner 120 RPM
            </span>
          </div>

          {/* Kinetic Francis Wheel SVG */}
          <div className="my-6 relative flex items-center justify-center">
            {/* Spinning Rotor Ring */}
            <div
              className="w-48 h-48 rounded-full border-2 border-[#C9A24B]/40 flex items-center justify-center animate-chakra-fast"
              style={{
                boxShadow: isLanternDimmed
                  ? "0 0 10px rgba(201, 162, 75, 0.15)"
                  : "0 0 24px rgba(240, 200, 96, 0.35)",
                willChange: "transform",
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                  <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F0D27A" />
                    <stop offset="60%" stopColor="#C9A24B" />
                    <stop offset="100%" stopColor="#6F5A2C" />
                  </linearGradient>
                </defs>
                {/* 12 Runner Blades */}
                <g transform="translate(100, 100)">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <path
                      key={i}
                      d="M 0 -25 C 18 -40, 36 -60, 24 -92 C 16 -92, 5 -55, 0 -25 Z"
                      fill="url(#bladeGrad)"
                      stroke="#C9A24B"
                      strokeWidth="0.8"
                      transform={`rotate(${i * 30})`}
                    />
                  ))}
                  {/* Central Hub */}
                  <circle cx="0" cy="0" r="24" fill="#13264A" stroke="#C9A24B" strokeWidth="2" />
                  <circle cx="0" cy="0" r="10" fill="#F0D27A" stroke="#6F5A2C" strokeWidth="1" />
                </g>
              </svg>
            </div>

            {/* Center Dynamo Shaft Pin */}
            <div className="absolute w-6 h-6 rounded-full bg-[#C9A24B] border-2 border-[#F0D27A] shadow-[0_0_8px_#F0D27A]" />
          </div>

          {/* Wheel Telemetry Info */}
          <div className="w-full bg-[#13264A]/50 border border-[#C9A24B]/20 p-2.5 rounded-sm">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#A3B0C8]">
              <span>Dynamo Output:</span>
              <span className="text-[#5FB3A8] font-bold">220V · 50 Hz</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[#A3B0C8] mt-1">
              <span>Secrecy Interlock:</span>
              <span
                className={`font-bold transition-colors ${
                  isLanternDimmed ? "text-[#E0705A]" : "text-[#5FB3A8]"
                }`}
              >
                {isLanternDimmed ? "ACTIVE (AIR-GAP)" : "DISENGAGED"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Auth Console & Nepali Edison Lantern (7 cols) */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          {/* Header Row with Lantern */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#C9A24B]">
                Himalayan SCADA Cockpit
              </p>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F1EAD9]">
                {isRegistering ? "Register Operator Station" : "Operator Authentication"}
              </h3>
            </div>

            {/* Brass Nepali Powerhouse Edison Lantern */}
            <div className="flex flex-col items-center">
              <div
                className="relative transition-all duration-500"
                style={{
                  filter: isLanternDimmed
                    ? "grayscale(80%) brightness(0.35)"
                    : "drop-shadow(0 0 20px rgba(240, 200, 96, 0.85))",
                }}
              >
                {/* Lantern Vector Graphic */}
                <svg width="42" height="62" viewBox="0 0 42 62" fill="none">
                  {/* Top Hanging Ring */}
                  <circle cx="21" cy="6" r="4.5" stroke="#C9A24B" strokeWidth="2" fill="none" />
                  {/* Brass Cap */}
                  <path
                    d="M 12 12 L 30 12 L 34 18 L 8 18 Z"
                    fill="#6F5A2C"
                    stroke="#C9A24B"
                    strokeWidth="1.5"
                  />
                  {/* Glass Chamber */}
                  <rect
                    x="10"
                    y="18"
                    width="22"
                    height="30"
                    rx="3"
                    fill={isLanternDimmed ? "rgba(20, 25, 40, 0.6)" : "rgba(255, 240, 180, 0.3)"}
                    stroke="#C9A24B"
                    strokeWidth="1.5"
                  />
                  {/* Glowing Edison Filament */}
                  <path
                    d="M 17 38 L 19 24 L 23 24 L 25 38"
                    stroke={isLanternDimmed ? "#554422" : "#FFF5D0"}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Brass Base */}
                  <rect
                    x="8"
                    y="48"
                    width="26"
                    height="8"
                    rx="1"
                    fill="#6F5A2C"
                    stroke="#C9A24B"
                    strokeWidth="1.5"
                  />
                </svg>

                {/* Lantern Amber Glow Bloom */}
                {!isLanternDimmed && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(240, 200, 96, 0.85) 0%, rgba(240, 200, 96, 0) 70%)",
                      transform: "scale(1.8)",
                      zIndex: -1,
                    }}
                  />
                )}
              </div>

              <span
                className="text-[9px] font-mono tracking-wider uppercase mt-1 transition-colors duration-300"
                style={{
                  color: isLanternDimmed ? "#E0705A" : "#F0D27A",
                }}
              >
                {isLanternDimmed ? "● DIMMED (SECRET)" : "● LANTERN LIT"}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-2.5 bg-[#E0705A]/20 border border-[#E0705A] text-[#F1EAD9] text-xs font-mono rounded-sm">
                {errorMsg}
              </div>
            )}

            {/* Email / Operator ID */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A3B0C8] mb-1.5">
                Operator Identifier / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@nea.gov.np"
                className="w-full px-3 py-2 bg-[#0B1424] border border-[#C9A24B]/40 focus:border-[#C9A24B] text-[#F1EAD9] font-mono text-sm rounded-sm outline-none transition-all placeholder:text-[#A3B0C8]/40"
              />
            </div>

            {/* Password / Access Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A3B0C8]">
                  Station Cryptographic Key
                </label>
                <span className="text-[10px] font-mono text-[#E0A43A]">
                  {isLanternDimmed ? "🔒 Lantern Dimmed for Secrecy" : "Eye Shield Active"}
                </span>
              </div>
              <input
                type="password"
                value={password}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-[#0B1424] border border-[#C9A24B]/40 focus:border-[#F0D27A] text-[#F1EAD9] font-mono text-sm rounded-sm outline-none transition-all placeholder:text-[#A3B0C8]/40"
              />
              <p className="text-[10px] font-sans text-[#A3B0C8] mt-1 italic">
                * Note: The powerhouse lantern dims dark when entering credentials to prevent
                shoulder-surfing.
              </p>
            </div>

            {/* Role Selection (If registering) */}
            {isRegistering && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A3B0C8] mb-1.5">
                  Authority Delegation Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1424] border border-[#C9A24B]/40 focus:border-[#C9A24B] text-[#F1EAD9] font-mono text-xs rounded-sm outline-none"
                >
                  <option value="Control Room Engineer">Control Room Engineer (Full Actuation)</option>
                  <option value="NEA Dispatcher">NEA Grid Dispatcher (Read + Dispatch Target)</option>
                  <option value="Chief Hydrologist">Chief Hydrologist (Silt / Forecast Audit)</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-bold text-sm tracking-wider uppercase rounded-sm transition-all shadow-[0_2px_12px_rgba(201,162,75,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? "Authenticating Session..."
                  : isRegistering
                  ? "REGISTER NEW OPERATOR"
                  : "LOGIN AS STATION OPERATOR"}
              </button>
            </div>
          </form>

          {/* Toggle Register / Login & Guest Option */}
          <div className="pt-4 border-t border-[#C9A24B]/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[#C9A24B] hover:text-[#F0D27A] transition-colors cursor-pointer"
            >
              {isRegistering
                ? "← Existing Operator? Login"
                : "Need Account? Register Station →"}
            </button>

            <button
              onClick={handleGuest}
              className="px-3 py-1 bg-[#13264A] hover:bg-[#1a3364] text-[#F1EAD9] border border-[#C9A24B]/30 rounded-sm transition-all cursor-pointer"
            >
              CONTINUE AS GUEST OPERATOR →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
