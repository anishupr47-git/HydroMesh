"use client";

import React, { useState } from "react";

interface AuthModalProps {
  onSuccess: (userData?: { role: string; email: string; user_id?: string; csrf_token?: string }) => void;
  onGuestAccess: () => void;
  onBack?: () => void;
  showBack?: boolean;
  onClose?: () => void;
}

export default function AuthModal({
  onSuccess,
  onGuestAccess,
  onBack,
  showBack = false,
  onClose,
}: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Control Room Engineer");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Lantern is LIT when idle or typing email; LANTERN IS COMPLETELY OFF when entering password!
  const isLanternOff = passwordFocused || password.length > 0;

  const handleQuickLogin = async () => {
    setIsRegistering(false);
    setEmail("neauser1@gmail.com");
    setPassword("DemoOperator2026!");
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: "neauser1@gmail.com", password: "DemoOperator2026!" }),
      });

      if (res.ok) {
        const data = await res.json();
        const finalEmail = data.user?.email || "neauser1@gmail.com";
        const finalRole = data.user?.role || "member";
        const finalId = data.user?.id || "usr_nea_demo1";
        const csrfToken = data.csrf_token;
        try {
          localStorage.setItem(
            "hydromesh_session",
            JSON.stringify({
              email: finalEmail,
              role: finalRole,
              user_id: finalId,
              csrf_token: csrfToken,
              authenticated_at: new Date().toISOString(),
            })
          );
          localStorage.setItem("hydromesh_onboarding_dismissed", "true");
        } catch {}
        setLoading(false);
        onSuccess({ role: finalRole, email: finalEmail, user_id: finalId, csrf_token: csrfToken });
        return;
      }
    } catch {}

    setLoading(false);
    if (onGuestAccess) {
      onGuestAccess();
    } else {
      onSuccess({ role: "member", email: "neauser1@gmail.com", user_id: "usr_nea_demo1" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter operator email and station cryptographic key.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const endpoint = isRegistering
        ? "http://127.0.0.1:8000/api/auth/register"
        : "http://127.0.0.1:8000/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const finalEmail = data.user?.email || email;
        const finalRole = data.user?.role || role;
        const finalId = data.user?.id;
        const csrfToken = data.csrf_token;
        try {
          localStorage.setItem(
            "hydromesh_session",
            JSON.stringify({
              email: finalEmail,
              role: finalRole,
              user_id: finalId,
              csrf_token: csrfToken,
              authenticated_at: new Date().toISOString(),
            })
          );
          localStorage.setItem("hydromesh_onboarding_dismissed", "true");
        } catch {}
        setLoading(false);
        onSuccess({ role: finalRole, email: finalEmail, user_id: finalId, csrf_token: csrfToken });
        return;
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || "Authentication failed. Please verify credentials.");
        setLoading(false);
        return;
      }
    } catch {
      // Offline fallback for preview without backend running
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
    }
  };

  const handleGuest = () => {
    try {
      localStorage.setItem("hydromesh_onboarding_dismissed", "true");
    } catch {}
    onGuestAccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: "rgba(11, 20, 36, 0.94)" }}
    >
      {/* Dynamic atmospheric radial vignette influenced by lantern light */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: isLanternOff
            ? "radial-gradient(circle at 50% 50%, rgba(6, 10, 18, 0.85) 0%, rgba(11, 20, 36, 0.98) 80%)"
            : "radial-gradient(circle at 50% 45%, rgba(240, 200, 96, 0.14) 0%, rgba(15, 29, 56, 0.5) 50%, rgba(11, 20, 36, 0.96) 85%)",
        }}
      />

      <div className="min-h-full flex flex-col justify-start sm:justify-center items-center p-4 sm:p-6 py-8 sm:py-12 relative z-10">
        {/* Stepper Header Bar */}
        <div className="w-full max-w-lg mb-3 flex items-center justify-between text-xs font-mono gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-[#C9A24B] font-bold">
              STEP 4 OF 4 · OPERATOR AUTHENTICATION
            </span>
            <span className="text-[#A3B0C8]/40">|</span>
            <div className="flex items-center gap-1 font-mono text-xs text-[#F0D27A]">
              <span>●</span>
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showBack && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#F1EAD9] uppercase tracking-wider cursor-pointer transition-colors"
              >
                [← BACK TO BRIEFING]
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-mono text-[#A3B0C8] hover:text-[#E0705A] uppercase tracking-wider cursor-pointer transition-colors"
              >
                [CLOSE]
              </button>
            )}
          </div>
        </div>

        {/* Clean, Simple Authentication Card */}
        <div className="w-full max-w-lg bg-[#0F1A2E] border border-[#C9A24B] shadow-2xl p-6 sm:p-8 rounded-sm">
          {/* Header: Title and the Powerhouse Lantern */}
          <div className="flex items-start justify-between pb-4 border-b border-[#C9A24B]/30 mb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9A24B] block">
                SCADA SECURITY PROTOCOL
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F1EAD9]">
                {isRegistering ? "Register Operator" : "Operator Authentication"}
              </h3>
              <p className="text-xs text-[#A3B0C8] font-mono mt-0.5">
                Access the 20-Powerhouse Himalayan Grid Cockpit
              </p>
            </div>

            {/* The Brass Powerhouse Lantern */}
            <div className="flex flex-col items-center pl-4">
              <div
                className="relative transition-all duration-500"
                style={{
                  filter: isLanternOff
                    ? "grayscale(1) opacity(0.2)"
                    : "drop-shadow(0 0 16px rgba(240, 200, 96, 0.95))",
                }}
                title={isLanternOff ? "Lantern OFF (Password Secrecy Active)" : "Lantern LIT (Powerhouse Active)"}
              >
                <svg
                  role="img"
                  aria-label="Station Operator Security Lantern"
                  width="36"
                  height="50"
                  viewBox="0 0 40 56"
                  fill="none"
                >
                  {/* Hanger Ring */}
                  <circle cx="20" cy="8" r="6" stroke="#C9A24B" strokeWidth="2" />
                  {/* Lantern Roof */}
                  <path d="M6 16L20 12L34 16L30 22H10L6 16Z" fill="#7A5C48" stroke="#C9A24B" />
                  {/* Glass Chamber */}
                  <rect x="10" y="22" width="20" height="24" stroke="#C9A24B" strokeWidth="1.5" fill="#1A1010" />
                  {/* Glowing Filament Core */}
                  <circle
                    cx="20"
                    cy="34"
                    r="6"
                    fill={isLanternOff ? "#2A1F18" : "#FFF0B3"}
                  />
                  <path
                    d="M18 38L20 30L22 38"
                    stroke={isLanternOff ? "#4A3520" : "#F0C860"}
                    strokeWidth="1.5"
                  />
                  {/* Base */}
                  <rect x="8" y="46" width="24" height="6" fill="#7A5C48" stroke="#C9A24B" />
                </svg>
              </div>
              <span
                className="text-[9px] font-mono uppercase tracking-wider mt-1 transition-colors whitespace-nowrap"
                style={{ color: isLanternOff ? "#A3B0C8" : "#F0D27A" }}
              >
                {isLanternOff ? "LANTERN OFF" : "LANTERN LIT"}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-[#E0705A]/15 border border-[#E0705A] text-[#E0705A] text-xs font-mono">
              [ERROR] {errorMsg}
            </div>
          )}

          {/* Quick Demo Showcase Credential Auto-Fill Card */}
          <div className="mb-4 p-3 bg-[#0B1424] border border-[#C9A24B]/40 rounded-sm flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#F0D27A] font-bold">
                  Demo Showcase Account (Clean 0-Data)
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#D9D2BF]">
                neauser1@gmail.com <span className="text-[#A3B0C8]/60">·</span> DemoOperator2026!
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickLogin}
                className="px-3 py-1.5 bg-gradient-to-r from-[#C9A24B] to-[#F0D27A] hover:brightness-110 text-[#0B1424] font-mono text-[10px] uppercase font-bold rounded cursor-pointer transition-all shadow-sm"
              >
                [1-Click Demo Login →]
              </button>
            </div>
          </div>

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] mb-1">
                Operator Identifier / Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@nea.gov.np"
                className="w-full bg-[#0B1424] border border-[#C9A24B]/40 focus:border-[#C9A24B] px-3 py-2 text-xs font-mono text-[#F1EAD9] outline-none rounded-sm transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8]">
                  Station Cryptographic Key
                </label>
                <span className="text-[10px] font-mono text-[#C9A24B]">
                  {isLanternOff ? "[EYE SHIELD ACTIVE]" : ""}
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="••••••••••••"
                className="w-full bg-[#0B1424] border border-[#C9A24B]/40 focus:border-[#C9A24B] px-3 py-2 text-xs font-mono text-[#F1EAD9] outline-none rounded-sm transition-colors tracking-widest"
                required
              />
              <div className="text-[9px] font-mono text-[#A3B0C8] mt-1">
                * Note: The powerhouse lantern dims dark when entering credentials to prevent shoulder-surfing.
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] mb-1">
                  Operational Authority Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#0B1424] border border-[#C9A24B]/40 focus:border-[#C9A24B] px-3 py-2 text-xs font-mono text-[#F1EAD9] outline-none rounded-sm transition-colors cursor-pointer"
                >
                  <option value="Control Room Engineer">Control Room Engineer</option>
                  <option value="Basin Hydrologist">Basin Hydrologist</option>
                  <option value="Plant General Manager">Plant General Manager</option>
                  <option value="NEA Grid Dispatcher">NEA Grid Dispatcher</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-[#C9A24B] to-[#F0D27A] hover:brightness-110 text-[#0B1424] font-serif font-bold text-xs uppercase tracking-widest rounded-sm transition-all shadow-[0_2px_8px_rgba(201,162,75,0.4)] disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading
                ? "AUTHENTICATING..."
                : isRegistering
                ? "REGISTER OPERATOR CREDENTIALS"
                : "LOGIN AS STATION OPERATOR"}
            </button>
          </form>

          {/* Simple Secondary Actions */}
          <div className="pt-4 border-t border-[#C9A24B]/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono mt-6">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg("");
              }}
              className="text-[#C9A24B] hover:text-[#F0D27A] underline cursor-pointer"
            >
              {isRegistering ? "Existing Operator? Login" : "Need Account? Register Station"}
            </button>

            <button
              type="button"
              onClick={handleGuest}
              className="px-3 py-1.5 bg-[#13264A] hover:bg-[#1a3364] border border-[#C9A24B]/50 text-[#F1EAD9] rounded-sm transition-colors cursor-pointer"
            >
              CONTINUE AS GUEST OPERATOR →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
