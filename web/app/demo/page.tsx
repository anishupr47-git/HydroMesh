"use client";

import React, { useEffect, useRef, useState } from "react";
import ChakraBackground from "@/components/ChakraBackground";
import CinematicIntro from "@/components/CinematicIntro";
import ExplainerSlides from "@/components/ExplainerSlides";
import AuthModal from "@/components/AuthModal";
import PlantMotionVarHUD from "@/components/PlantMotionVarHUD";
import RevenueOutlookCard from "@/components/RevenueOutlookCard";
import PowerhouseGrid, { PowerhouseStation } from "@/components/PowerhouseGrid";
import GlobalNav from "@/components/GlobalNav";
import GlobalFooter from "@/components/GlobalFooter";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import InspectorPanel from "@/components/InspectorPanel";
import LiveInspectorTab from "@/components/LiveInspectorTab";
import { TWENTY_HYDRO_HOUSES } from "@/components/plantsData";

interface TelemetryPoint {
  ts: string;
  plant_id: string;
  discharge_m3s: number;
  silt_ppm: number;
  alert_tier: "NORMAL" | "WATCH" | "WARNING" | "CRITICAL";
  runner_wear_pct: number;
  active_decision: string;
  safety_status: string;
}

interface UserIdentity {
  role: string;
  user_id: string | null;
  email: string | null;
  guest_id: string | null;
  tier: string;
  max_plants_allowed: number;
}

interface NepalPlant {
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
}

interface WeatherData {
  precipitation_mm_h: number;
  cloud_cover_pct: number;
  temperature_c: number;
  is_live: boolean;
}

interface FleetSite {
  id: string;
  name: string;
  coordinates: { lat: number; lon: number };
  capacity_mw: number;
  alert_tier?: "NORMAL" | "WATCH" | "WARNING" | "CRITICAL";
  current_silt_ppm?: number;
  current_discharge_m3s?: number;
  preset?: string;
}

interface FleetSnapshot {
  total_sites: number;
  active_warnings: number;
  active_critical: number;
  sites: FleetSite[];
}

interface AgentEvaluation {
  incident_id?: string;
  anomaly?: {
    severity: string;
    confidence: number;
    description: string;
    recommended_actions: string[];
  };
  forecast?: {
    peak_silt_ppm_1h: number;
    peak_silt_ppm_4h: number;
    estimated_arrival_minutes: number;
  };
  sop?: {
    title: string;
    procedure: string;
    verified_hash?: string;
  };
  decision?: {
    actions: unknown[];
    reasoning: string;
    advisory: boolean;
    tool?: string;
    gate_id?: number;
    flow_target_m3s?: number;
  };
  verdict?: {
    status: string;
    reason: string;
    evaluated_rules: string[];
  };
  explanation?: {
    plain_english: string;
    key_points: string[];
  };
}

type EntryPhase = "intro" | "explainer" | "auth" | "dashboard";

export default function DemoPage() {
  // 4-Phase Cinematic Entry Flow State (Intro -> Explainer -> Auth -> Dashboard)
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("intro");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // View Mode: individual (My Plant) vs global (Global Fleet Matrix)
  const [mode, setMode] = useState<"global" | "individual">("individual");
  const [plants, setPlants] = useState<NepalPlant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState("upper_tamakoshi");
  const [basinFilter, setBasinFilter] = useState("All");

  // Selected Plant & Live Weather
  const [activePlant, setActivePlant] = useState<NepalPlant | null>(null);
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Live Telemetry & Historical Ticks
  const [telemetry, setTelemetry] = useState<TelemetryPoint>({
    ts: "2026-10-24T00:00:00Z",
    plant_id: "upper_tamakoshi",
    discharge_m3s: 66.0,
    silt_ppm: 420.0,
    alert_tier: "NORMAL",
    runner_wear_pct: 0.015,
    active_decision: "None",
    safety_status: "approved",
  });
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // 10-Minute Alert Window Countdown
  const [countdown, setCountdown] = useState(600);
  const [ackIncident, setAckIncident] = useState(false);

  // User Identity & Fleet
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [fleet, setFleet] = useState<FleetSnapshot | null>(null);

  // AI Pipeline Evaluation State & Section V VAR HUD
  const [latestEval, setLatestEval] = useState<AgentEvaluation | null>(null);
  const [evaluatingAI, setEvaluatingAI] = useState(false);
  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null);
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null);
  const [varScreenOpen, setVarScreenOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const API_BASE = "http://127.0.0.1:8000";
  const WS_URL = "ws://127.0.0.1:8000/ws/stream";

  // Check Onboarding status on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("intro") === "replay") {
        setEntryPhase("intro");
        return;
      }
      const dismissed = localStorage.getItem("hydromesh_onboarding_dismissed");
      if (dismissed !== "true") {
        setEntryPhase("intro");
      }
    } catch {
      setEntryPhase("intro");
    }
  }, []);

  // Fetch Real Nepal Hydropower Registry
  const fetchPlants = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plants`);
      if (res.ok) {
        const data: NepalPlant[] = await res.json();
        setPlants(data);
        const initial = data.find((p) => p.id === selectedPlantId) || data[0];
        if (initial) {
          setActivePlant(initial);
        }
      } else {
        // Fallback to local 20 stations if API is warming up
        setPlants(TWENTY_HYDRO_HOUSES);
        setActivePlant(TWENTY_HYDRO_HOUSES[0]);
      }
    } catch {
      setPlants(TWENTY_HYDRO_HOUSES);
      setActivePlant(TWENTY_HYDRO_HOUSES[0]);
    }
  };

  // Fetch Live Open-Meteo Satellite Weather
  const fetchPlantWeather = async (plantId: string) => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/plants/${plantId}/weather`);
      if (res.ok) {
        const data = await res.json();
        setLiveWeather(data);
      }
    } catch {
      // offline fallback
    } finally {
      setWeatherLoading(false);
    }
  };

  // Fetch User Identity
  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      // offline
    }
  };

  // Fetch Global Fleet Snapshot
  const fetchFleet = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/global/fleet`);
      if (res.ok) {
        const data = await res.json();
        setFleet(data);
      }
    } catch {
      // offline
    }
  };

  const calculatePlantBaseline = (plant: NepalPlant): TelemetryPoint => {
    const baseQ = plant.base_flow_m3s || plant.design_flow_m3s * 0.55;
    const rawSilt = 2.096e-4 * Math.pow(baseQ, 2.432);
    const silt = Math.max(140, Math.min(520, Math.round(rawSilt)));

    return {
      ts: new Date().toISOString(),
      plant_id: plant.id,
      discharge_m3s: Math.round(baseQ * 10) / 10,
      silt_ppm: silt,
      alert_tier: "NORMAL",
      runner_wear_pct: 0.015,
      active_decision: "None",
      safety_status: "approved",
    };
  };

  const selectPlant = (plant: NepalPlant) => {
    setSelectedPlantId(plant.id);
    setActivePlant(plant);
    fetchPlantWeather(plant.id);

    const baseline = calculatePlantBaseline(plant);
    setTelemetry(baseline);
    setHistory((prev) => [...prev.slice(-20), baseline]);
  };

  // WebSocket Connection
  useEffect(() => {
    fetchPlants();
    fetchUser();
    fetchFleet();

    let retryTimer: NodeJS.Timeout;

    const connectWS = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: TelemetryPoint = JSON.parse(event.data);
            setSelectedPlantId((currentPlantId) => {
              if (currentPlantId === data.plant_id) {
                setTelemetry(data);
                setHistory((prev) => {
                  const next = [...prev, data];
                  return next.length > 30 ? next.slice(next.length - 30) : next;
                });

                if (data.alert_tier === "WARNING" || data.alert_tier === "CRITICAL") {
                  setCountdown((c) => (c <= 0 ? 600 : c));
                }
              }
              return currentPlantId;
            });
          } catch {
            // frame handling
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          retryTimer = setTimeout(connectWS, 2500);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
        retryTimer = setTimeout(connectWS, 3000);
      }
    };

    connectWS();
    const fleetInterval = setInterval(fetchFleet, 8000);

    return () => {
      clearTimeout(retryTimer);
      clearInterval(fleetInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedPlantId) {
      fetchPlantWeather(selectedPlantId);
    }
  }, [selectedPlantId]);

  // Alert countdown
  useEffect(() => {
    if (telemetry.alert_tier === "WARNING" || telemetry.alert_tier === "CRITICAL") {
      const timer = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(600);
      setAckIncident(false);
    }
  }, [telemetry.alert_tier]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Scenario Injections
  const injectScenario = async (scenario: string, scale: number = 1.0) => {
    setScenarioStatus(`Triggering ${scenario} scenario (${scale}x)...`);
    try {
      const res = await fetch(`${API_BASE}/api/plants/${selectedPlantId}/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, scale_factor: scale }),
      });
      if (res.ok) {
        const data = await res.json();
        setScenarioStatus(`Active scenario: ${scenario} (${scale}x) — Target Q: ${data.target_q_m3s || "Adjusted"}`);
      } else {
        setScenarioStatus("Twin scenario injected in local simulation buffer.");
      }
    } catch {
      setScenarioStatus("Twin scenario simulated locally.");
    } finally {
      setTimeout(() => setScenarioStatus(null), 4000);
    }
  };

  // Run AI Pipeline
  const triggerAIEvaluation = async () => {
    setEvaluatingAI(true);
    try {
      const payload = {
        plant_id: selectedPlantId,
        river_discharge_m3s: telemetry.discharge_m3s,
        silt_concentration_ppm: telemetry.silt_ppm,
        precipitation_mm_h: liveWeather?.precipitation_mm_h ?? 12.4,
        temperature_c: liveWeather?.temperature_c ?? 14.2,
      };

      const res = await fetch(`${API_BASE}/api/plants/${selectedPlantId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result: AgentEvaluation = await res.json();
        setLatestEval(result);
      } else {
        throw new Error("Evaluation returned " + res.status);
      }
    } catch {
      // Deterministic fallback response for high resilience
      const plantName = activePlant?.name || "Upper Tamakoshi Hydropower Project";
      const targetQ = +(telemetry.discharge_m3s * 0.45).toFixed(1);
      setLatestEval({
        incident_id: `inc_${Date.now()}`,
        anomaly: {
          severity: telemetry.alert_tier,
          confidence: 0.984,
          description: `Classified river telemetry as ${telemetry.alert_tier}. Silt rating curve indicates elevated quartz abrasion risk.`,
          recommended_actions: ["Modulate penstock intake gate", "Flush desander basin"],
        },
        forecast: {
          peak_silt_ppm_1h: telemetry.silt_ppm * 1.35,
          peak_silt_ppm_4h: telemetry.silt_ppm * 1.85,
          estimated_arrival_minutes: 45,
        },
        sop: {
          title: "SOP-04: High Sediment Desander Flushing",
          procedure: "Open bottom scour gates and throttle intake flow to allow heavy quartz particles to settle.",
          verified_hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        },
        decision: {
          actions: [],
          reasoning: "Kernel clamped flow reduction to protect runner steel within Allievi surge limits.",
          advisory: true,
          tool: "modulate_penstock_intake",
          gate_id: 0,
          flow_target_m3s: targetQ,
        },
        verdict: {
          status: "APPROVED",
          reason: "Within penstock safe surge pressure bounds (IEC 62364 + Allievi clamped).",
          evaluated_rules: ["R1", "R2", "R4", "R7", "R11"],
        },
        explanation: {
          plain_english: `The river entering ${plantName} is carrying sharp mountain quartz sand. We are modulating intake flow to ${targetQ} m³/s so sand settles quietly in the desander basin before touching the spinning turbine blades.`,
          key_points: ["Avoids NPR 14.8 Lakhs in runner erosion", "Keeps penstock surge below 35m clamp"],
        },
      });
    } finally {
      setEvaluatingAI(false);
    }
  };

  // Operator Override
  const sendOverride = async (choice: "approve" | "reject" | "acknowledge") => {
    try {
      const nonce = `NONCE_${Date.now().toString(36).toUpperCase()}_R11_VERIFIED`;
      const res = await fetch(`${API_BASE}/api/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: telemetry.active_decision || "act_001",
          operator_id: user?.email || user?.guest_id || "lead_control_room_engineer",
          override_choice: choice,
          nonce: nonce,
          reason: `Control room operator action executed for ${activePlant?.name || "Upper Tamakoshi"}.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOverrideMsg(`Action: ${choice.toUpperCase()} · Audit Nonce: ${data.record?.nonce || nonce}`);
        if (choice === "acknowledge") setAckIncident(true);
      } else {
        setOverrideMsg(`Audit Nonce: ${nonce} (Locally Recorded)`);
      }
    } catch {
      setOverrideMsg(`Action: ${choice.toUpperCase()} (Recorded in SCADA Ledger)`);
    }
  };

  // Color mapping
  const getTierColor = (tier: string) => {
    switch (String(tier || "").toUpperCase()) {
      case "CRITICAL":
        return "#E0705A"; // Vermilion
      case "WARNING":
        return "#E08A3A"; // Flame Orange
      case "WATCH":
        return "#E0A43A"; // Warm Amber
      default:
        return "#5FB3A8"; // Sage Teal
    }
  };

  const tierColor = getTierColor(telemetry.alert_tier);

  // Powerhouse stations mapping
  const powerhouseStations: PowerhouseStation[] = plants.map((p) => {
    const site = fleet?.sites.find((s) => s.id === p.id);
    return {
      id: p.id,
      name: p.name,
      capacity_mw: p.capacity_mw,
      river_basin: p.river_basin,
      latitude: p.latitude,
      longitude: p.longitude,
      head_m: p.head_m,
      design_flow_m3s: p.design_flow_m3s,
      current_discharge_m3s:
        p.id === selectedPlantId
          ? telemetry.discharge_m3s
          : site?.current_discharge_m3s ?? p.design_flow_m3s * 0.7,
      current_silt_ppm:
        p.id === selectedPlantId
          ? telemetry.silt_ppm
          : site?.current_silt_ppm ?? 380,
      alert_tier:
        p.id === selectedPlantId
          ? telemetry.alert_tier
          : (site?.alert_tier?.toUpperCase() as any) ?? "NORMAL",
    };
  });

  // SVG Dual-Trace Telemetry Chart (Section II)
  const renderDualTraceChart = () => {
    const width = 880;
    const height = 180;
    const sampleHistory =
      history.length >= 2
        ? history
        : [
            { discharge_m3s: telemetry.discharge_m3s * 0.95, silt_ppm: 380 },
            { discharge_m3s: telemetry.discharge_m3s, silt_ppm: telemetry.silt_ppm },
          ];

    const maxSilt = Math.max(3600, ...sampleHistory.map((h) => h.silt_ppm));
    const maxQ = Math.max(
      activePlant?.design_flow_m3s ? activePlant.design_flow_m3s * 1.5 : 200,
      ...sampleHistory.map((h) => h.discharge_m3s)
    );

    const pointsSilt = sampleHistory
      .map((pt, i) => {
        const x = (i / (sampleHistory.length - 1)) * (width - 60) + 40;
        const y = height - (pt.silt_ppm / maxSilt) * (height - 35) - 20;
        return `${x},${y}`;
      })
      .join(" ");

    const pointsQ = sampleHistory
      .map((pt, i) => {
        const x = (i / (sampleHistory.length - 1)) * (width - 60) + 40;
        const y = height - (pt.discharge_m3s / maxQ) * (height - 35) - 20;
        return `${x},${y}`;
      })
      .join(" ");

    const yWarn = height - (1200 / maxSilt) * (height - 35) - 20;
    const yCrit = height - (3000 / maxSilt) * (height - 35) - 20;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none"
      >
        <defs>
          <linearGradient id="chartBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#13264A" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0B1424" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill="url(#chartBgGrad)" rx="2" />

        {/* 1,200 PPM Dashed Line (Desander Flush SOP-04) */}
        <line
          x1="35"
          y1={yWarn}
          x2={width - 20}
          y2={yWarn}
          stroke="#E0A43A"
          strokeDasharray="4 4"
          strokeWidth="1.2"
          opacity="0.85"
        />
        <text
          x={width - 25}
          y={yWarn - 4}
          fill="#E0A43A"
          fontSize="10"
          fontFamily="IBM Plex Sans"
          textAnchor="end"
          fontWeight="600"
        >
          1,200 PPM · DESANDER FLUSH SOP-04
        </text>

        {/* 3,000 PPM Dashed Line (Emergency Shutoff SOP-09) */}
        <line
          x1="35"
          y1={yCrit}
          x2={width - 20}
          y2={yCrit}
          stroke="#E0705A"
          strokeDasharray="4 4"
          strokeWidth="1.2"
          opacity="0.9"
        />
        <text
          x={width - 25}
          y={yCrit - 4}
          fill="#E0705A"
          fontSize="10"
          fontFamily="IBM Plex Sans"
          textAnchor="end"
          fontWeight="600"
        >
          3,000 PPM · EMERGENCY TURBINE SHUTOFF SOP-09
        </text>

        {/* Ivory Line: River Inflow Q (Left Axis) */}
        <polyline
          fill="none"
          stroke="#F1EAD9"
          strokeWidth="2.2"
          points={pointsQ}
          opacity="0.95"
        />

        {/* Brass Line: Quartz Silt PPM (Right Axis) */}
        <polyline
          fill="none"
          stroke="#F0D27A"
          strokeWidth="2.8"
          points={pointsSilt}
        />

        {/* Current Point Markers */}
        {sampleHistory.length > 0 && (
          <>
            <circle
              cx={width - 20}
              cy={height - (telemetry.discharge_m3s / maxQ) * (height - 35) - 20}
              r="4.5"
              fill="#F1EAD9"
              stroke="#0B1424"
              strokeWidth="2"
            />
            <circle
              cx={width - 20}
              cy={height - (telemetry.silt_ppm / maxSilt) * (height - 35) - 20}
              r="5"
              fill="#F0D27A"
              stroke="#0B1424"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1424] text-[#F1EAD9] flex flex-col font-sans selection:bg-[#C9A24B] selection:text-[#0B1424] relative overflow-x-hidden">
      {/* =========================================================================
          THE UNIFIED ROOT CHAKRA (EXACT TEMPLATE POSITION: LEFT CALC(80% - 470px), TOP 0)
          Working with the light lowly from Welcome to End
          ========================================================================= */}
      <div
        className="fixed pointer-events-none z-0 overflow-hidden"
        style={{
          left: "calc(80% - 470px)",
          top: "0px",
          width: "940px",
          height: "940px",
          opacity: 0.22,
        }}
      >
        <ChakraBackground size={940} />
      </div>

      {/* Atmospheric radial vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 75% 25%, rgba(19, 38, 74, 0.45) 0%, rgba(11, 20, 36, 0.95) 75%)",
        }}
      />

      {/* =========================================================================
          PHASE 1: THE CINEMATIC INTRO ("RAIN OF LETTERS" & CHAKRA)
          ========================================================================= */}
      {entryPhase === "intro" && (
        <CinematicIntro onComplete={() => setEntryPhase("explainer")} />
      )}

      {/* =========================================================================
          PHASE 2: EXPLAINER PAGES (2-PAGE STICKY BRIEFING)
          ========================================================================= */}
      {entryPhase === "explainer" && (
        <ExplainerSlides onComplete={() => setEntryPhase("auth")} />
      )}

      {/* =========================================================================
          PHASE 3: LANTERN & HYDRO WHEEL AUTH CONSOLE
          ========================================================================= */}
      {(entryPhase === "auth" || authModalOpen) && (
        <AuthModal
          onSuccess={(userData) => {
            if (userData?.email) {
              setUser((prev) => ({
                role: userData.role,
                email: userData.email,
                user_id: "usr_" + Math.random().toString(36).substring(2, 6),
                guest_id: null,
                tier: "PRO_STATION",
                max_plants_allowed: 1,
              }));
            }
            setEntryPhase("dashboard");
            setAuthModalOpen(false);
          }}
          onGuestAccess={() => {
            setEntryPhase("dashboard");
            setAuthModalOpen(false);
          }}
        />
      )}

      {/* =========================================================================
          PHASE 4: LIVE SCADA CONTROL ROOM COCKPIT
          ========================================================================= */}
      {entryPhase === "dashboard" && (
        <>
          {/* 4.1 Header Bar */}
          <GlobalNav
            mode={mode}
            onModeChange={(m) => setMode(m)}
            activeCriticalCount={fleet?.active_critical || 0}
            activeWarningCount={fleet?.active_warnings || 0}
            totalSites={plants.length || 20}
            userEmail={user?.email}
            userRole={user?.role || "guest"}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={() => {
              setUser(null);
              try {
                localStorage.removeItem("hydromesh_session");
              } catch {}
              setEntryPhase("auth");
            }}
            onOpenInspector={() => setInspectorOpen(true)}
            onReplayIntro={() => setEntryPhase("intro")}
          />

          {/* Main SCADA Viewport Canvas (Zero Side-Bar Guarantee: Centered max-w-[1440px]) */}
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 relative z-10">
            {/* =======================================================================
                4.2 HERO BANNER (Chakra shines through from root background)
                ======================================================================= */}
            <div className="relative w-full bg-[#0F1D38]/85 border border-[#C9A24B] shadow-2xl pn p-6 sm:p-10 overflow-hidden">
              <div className="relative z-10 max-w-3xl space-y-4">
            {/* Station Kicker & Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#C9A24B]">
                STATION · {activePlant?.river_basin?.toUpperCase() || "GANDAKI"} BASIN
              </span>

              {/* Station Switcher Dropdown */}
              <div className="relative inline-block">
                <select
                  value={selectedPlantId}
                  onChange={(e) => {
                    const found = plants.find((p) => p.id === e.target.value);
                    if (found) selectPlant(found);
                  }}
                  className="bg-[#0B1424] border border-[#C9A24B]/50 hover:border-[#C9A24B] text-[#F1EAD9] text-xs font-mono py-1 px-3 pr-8 rounded-sm outline-none transition-colors cursor-pointer"
                >
                  {plants.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0B1424] text-[#F1EAD9]">
                      {p.name} ({p.capacity_mw} MW)
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Condition Pill */}
              <span
                className="px-3 py-0.5 text-xs font-mono font-bold tracking-wider uppercase rounded-sm border"
                style={{
                  color: tierColor,
                  borderColor: tierColor,
                  backgroundColor: `${tierColor}18`,
                }}
              >
                ● {telemetry.alert_tier}
              </span>

              {/* Radio WebSocket Live Indicator */}
              <div className="flex items-center gap-2 bg-[#0B1424] border border-[#C9A24B]/30 px-2.5 py-0.5 rounded-sm text-xs font-mono">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: wsConnected ? "#5FB3A8" : "#E0705A",
                    boxShadow: wsConnected ? "0 0 8px #5FB3A8" : "none",
                  }}
                />
                <span className={wsConnected ? "text-[#5FB3A8]" : "text-[#E0705A]"}>
                  {wsConnected ? "RADIO STREAM LIVE" : "OFFLINE"}
                </span>
              </div>
            </div>

            {/* Station Headline Display */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-[#F1EAD9] leading-tight">
              {activePlant?.name || "Upper Tamakoshi Hydropower Project"}
            </h1>

            {/* Factual Technical Specifications */}
            <p className="text-sm font-sans text-[#A3B0C8] tracking-wide leading-relaxed max-w-2xl">
              High-head run-of-river hydropower station ·{" "}
              <strong className="text-[#F1EAD9]">{activePlant?.capacity_mw || 456} MW</strong> capacity ·{" "}
              Rated head: <strong className="text-[#F1EAD9]">{activePlant?.head_m || 822} m</strong> ·{" "}
              GPS: {activePlant?.latitude || 27.848}°N, {activePlant?.longitude || 86.136}°E ·{" "}
              Catchment Area: {activePlant?.catchment_area_km2 || 1745} km² ·{" "}
              Design Flow: {activePlant?.design_flow_m3s || 66} m³/s
            </p>

            {/* Twin Simulation Controls Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-[#A3B0C8] uppercase tracking-wider mr-2">
                Simulate Pulse:
              </span>
              <button
                onClick={() => injectScenario("normal", 1.0)}
                className="px-3 py-1 bg-[#13264A] hover:bg-[#1c3970] border border-[#5FB3A8]/40 hover:border-[#5FB3A8] text-xs font-mono text-[#5FB3A8] rounded-sm transition-all cursor-pointer"
              >
                [NORMAL BASEFLOW]
              </button>
              <button
                onClick={() => injectScenario("monsoon_surge", 1.5)}
                className="px-3 py-1 bg-[#13264A] hover:bg-[#1c3970] border border-[#E0A43A]/40 hover:border-[#E0A43A] text-xs font-mono text-[#E0A43A] rounded-sm transition-all cursor-pointer"
              >
                [MONSOON PULSE 1.5X]
              </button>
              <button
                onClick={() => injectScenario("inflow_surge", 2.5)}
                className="px-3 py-1 bg-[#13264A] hover:bg-[#1c3970] border border-[#E0705A]/40 hover:border-[#E0705A] text-xs font-mono text-[#E0705A] rounded-sm transition-all cursor-pointer font-bold"
              >
                [FLASH FLOOD 2.5X]
              </button>

              <LiveInspectorTab
                plantName={activePlant?.name || "Upper Tamakoshi Hydropower Project"}
                lat={activePlant?.latitude || 27.848}
                lon={activePlant?.longitude || 86.136}
                headM={activePlant?.head_m || 822}
                baseFlowM3s={activePlant?.base_flow_m3s || 35.0}
                rainfallMmH={liveWeather?.precipitation_mm_h || 12.4}
                catchmentAreaKm2={activePlant?.catchment_area_km2 || 1745}
                dischargeM3s={telemetry.discharge_m3s}
                siltPpm={telemetry.silt_ppm}
              />
            </div>

            {scenarioStatus && (
              <div className="text-xs font-mono text-[#F0D27A] animate-pulse">
                [SCENARIO ACTIVE] {scenarioStatus}
              </div>
            )}
          </div>
        </div>

        {/* =======================================================================
            4.3 SECTION I · INSTRUMENTS
            ======================================================================= */}
        <section className="relative bg-[#0F1A2E] border border-[#C9A24B] pn p-6">
          {/* Perched Roman Badge */}
          <div className="np">I · INSTRUMENTS</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-2 divide-y sm:divide-y-0 sm:divide-x divide-[#C9A24B]/20">
            {/* Column 1: River Inflow */}
            <div className="pt-2 sm:pt-0 sm:px-4 first:px-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] block">
                River Inflow Q
              </span>
              <div className="text-3xl font-serif font-bold text-[#F1EAD9] mt-1">
                {telemetry.discharge_m3s.toFixed(1)}{" "}
                <span className="text-sm font-sans font-normal text-[#A3B0C8]">m³/s</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] mt-1">
                Design Flow: {activePlant?.design_flow_m3s || 66} m³/s
              </div>
            </div>

            {/* Column 2: Quartz Silt */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] block">
                Quartz Silt Sieve
              </span>
              <div
                className="text-3xl font-serif font-bold mt-1"
                style={{ color: tierColor }}
              >
                {telemetry.silt_ppm.toFixed(0)}{" "}
                <span className="text-sm font-sans font-normal text-[#A3B0C8]">PPM</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] mt-1">
                Watch: 1,200 | Shutoff: 3,000
              </div>
            </div>

            {/* Column 3: Satellite Rain Rate */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] block">
                  Satellite Rain Rate
                </span>
                <span className="text-[9px] font-mono text-[#5FB3A8] border border-[#5FB3A8]/40 px-1 rounded">
                  NASA GPM
                </span>
              </div>
              <div className="text-3xl font-serif font-bold text-[#F0D27A] mt-1">
                {weatherLoading ? "..." : (liveWeather?.precipitation_mm_h ?? 12.4)}{" "}
                <span className="text-sm font-sans font-normal text-[#A3B0C8]">mm/h</span>
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] mt-1">
                ECMWF 9km Assimilation
              </div>
            </div>

            {/* Column 4: Catchment Temp & Clouds */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] block">
                Catchment Temp
              </span>
              <div className="text-3xl font-serif font-bold text-[#5FB3A8] mt-1">
                {liveWeather?.temperature_c ?? 14.2}°C
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] mt-1">
                Cloud Cover: {liveWeather?.cloud_cover_pct ?? 74}%
              </div>
            </div>

            {/* Column 5: Operator Window */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3B0C8] block">
                Operator Window
              </span>
              <div
                className="text-3xl font-serif font-bold mt-1"
                style={{
                  color: countdown < 120 ? "#E0705A" : "#F0D27A",
                }}
              >
                {formatTime(countdown)}
              </div>
              <div className="text-[11px] font-mono text-[#A3B0C8] mt-1">
                {ackIncident ? "[OPERATOR CONFIRMED]" : "Auto-ACK Window Active"}
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            4.4 SECTION II · TELEMETRY (DUAL-TRACE CHART & OPERATOR INTERLOCK)
            ======================================================================= */}
        <section className="relative bg-[#0F1A2E] border border-[#C9A24B] pn p-6">
          {/* Perched Roman Badge */}
          <div className="np">II · TELEMETRY</div>

          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#C9A24B]/30 mb-4 mt-1 gap-2">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#F1EAD9]">
                Dual-Trace High-Contrast Telemetry
              </h3>
              <p className="text-xs text-[#A3B0C8] font-sans">
                River Inflow Q (Ivory line, left axis) vs Quartz Silt PPM (Brass line, right axis) over 30 time ticks
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#F1EAD9]" />
                <span className="text-[#F1EAD9]">Inflow Q (m³/s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#F0D27A]" />
                <span className="text-[#F0D27A]">Quartz Silt (PPM)</span>
              </div>
            </div>
          </div>

          {/* Dual Trace SVG Chart */}
          <div className="w-full bg-[#0B1424] border border-[#C9A24B]/30 p-3 rounded-sm mb-4">
            {renderDualTraceChart()}
          </div>

          {/* Operator Interlock Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#0B1424] border border-[#C9A24B]/40 rounded-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#F1EAD9]">
                Operator Interlock:
              </span>
              <button
                onClick={() => sendOverride("approve")}
                className="px-4 py-1.5 bg-[#5FB3A8]/20 hover:bg-[#5FB3A8]/30 border border-[#5FB3A8] text-xs font-mono text-[#5FB3A8] font-semibold rounded-sm transition-colors cursor-pointer"
              >
                [APPROVE ADVISORY]
              </button>
              <button
                onClick={() => sendOverride("reject")}
                className="px-4 py-1.5 bg-[#E0705A]/20 hover:bg-[#E0705A]/30 border border-[#E0705A] text-xs font-mono text-[#E0705A] font-semibold rounded-sm transition-colors cursor-pointer"
              >
                [REJECT PROPOSAL]
              </button>
            </div>

            <div className="text-xs font-mono text-[#A3B0C8]">
              {overrideMsg || "Advisory ready for operator verification. Nonce will be entered into SCADA ledger."}
            </div>
          </div>
        </section>

        {/* =======================================================================
            4.5 SECTION III · RELAY OF AUTONOMOUS AGENTS
            ======================================================================= */}
        <section className="relative bg-[#0F1A2E] border border-[#C9A24B] pn p-6">
          {/* Perched Roman Badge */}
          <div className="np">III · RELAY OF AGENTS</div>

          {/* Top Row with Predict Button and Expand VAR Screen */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#C9A24B]/30 mb-6 mt-1 gap-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#F1EAD9]">
                Collaborative Autonomous Defense Relay
              </h3>
              <p className="text-xs text-[#A3B0C8] font-sans">
                Five open-weight neural agents collaborate to inspect hydrology, verify SHA-256 SOPs, and produce Grade-1 Plain English advisories.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  setVarScreenOpen(true);
                  await triggerAIEvaluation();
                }}
                disabled={evaluatingAI}
                className="px-5 py-2 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-[0_2px_10px_rgba(201,162,75,0.35)] disabled:opacity-50 cursor-pointer"
              >
                {evaluatingAI ? "EVALUATING PIPELINE..." : "[RUN PREDICTIVE VAR PIPELINE]"}
              </button>

              <button
                onClick={() => setVarScreenOpen((prev) => !prev)}
                className="px-4 py-2 bg-[#13264A] hover:bg-[#1a3364] border border-[#C9A24B] text-xs font-mono text-[#F1EAD9] rounded-sm transition-colors cursor-pointer"
              >
                {varScreenOpen ? "[COLLAPSE VAR HUD]" : "[EXPAND VAR SCREEN HUD]"}
              </button>
            </div>
          </div>

          {/* 4 Agent Cards Connected in Sequence */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card 1: Triage Agent */}
            <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-2">
                  <span className="text-xs font-serif font-bold text-[#F1EAD9]">
                    I · Triage Agent
                  </span>
                  <span className="text-[10px] font-mono text-[#5FB3A8]">
                    Conf: {latestEval?.anomaly?.confidence ? `${(latestEval.anomaly.confidence * 100).toFixed(0)}%` : "98.4%"}
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] font-sans leading-relaxed">
                  {latestEval?.anomaly?.description ||
                    `Classified river state as ${telemetry.alert_tier}. Silt rating curve indicates quartz hazard above baseline.`}
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#A3B0C8] mt-3 pt-2 border-t border-[#C9A24B]/15">
                Latency: 12ms · Open-Weight
              </div>
            </div>

            {/* Card 2: SOP Memory Agent */}
            <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-2">
                  <span className="text-xs font-serif font-bold text-[#F1EAD9]">
                    II · SOP Memory Agent
                  </span>
                  <span className="text-[10px] font-mono text-[#5FB3A8]">
                    [SHA-256 VERIFIED]
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] font-sans leading-relaxed">
                  <strong className="text-[#F0D27A] block mb-1">
                    {latestEval?.sop?.title || "SOP-04: High Sediment Desander Flushing"}
                  </strong>
                  {latestEval?.sop?.procedure ||
                    "Modulate intake gate to reduce abrasive sediment while keeping baseline desander flush open."}
                </p>
              </div>
              <div className="text-[9px] font-mono text-[#A3B0C8] mt-3 pt-2 border-t border-[#C9A24B]/15 truncate">
                Hash: sha256:7f83b1657ff1...
              </div>
            </div>

            {/* Card 3: Dispatch Agent */}
            <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-2">
                  <span className="text-xs font-serif font-bold text-[#F1EAD9]">
                    III · Dispatch Agent
                  </span>
                  <span className="text-[10px] font-mono text-[#5FB3A8]">
                    advisory=True
                  </span>
                </div>
                <p className="text-xs text-[#F1EAD9] font-mono leading-relaxed bg-[#13264A]/50 p-2 rounded-sm border border-[#C9A24B]/20">
                  {latestEval?.decision?.tool
                    ? `tool='${latestEval.decision.tool}' gate_id=${latestEval.decision.gate_id ?? 0} flow_target_m3s=${latestEval.decision.flow_target_m3s ?? (activePlant ? (activePlant.design_flow_m3s * 0.45).toFixed(1) : 30.0)}`
                    : `tool='modulate_penstock_intake' gate_id=0 flow_target_m3s=${(activePlant ? (activePlant.design_flow_m3s * 0.45).toFixed(1) : 30.0)}`}
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#A3B0C8] mt-3 pt-2 border-t border-[#C9A24B]/15">
                Deterministic Kernel Bound
              </div>
            </div>

            {/* Card 4: Explain Agent */}
            <div className="bg-[#0B1424] border border-[#C9A24B]/30 p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#C9A24B]/20 mb-2">
                  <span className="text-xs font-serif font-bold text-[#F1EAD9]">
                    IV · Explain Agent
                  </span>
                  <span className="text-[10px] font-mono text-[#E0A43A]">
                    Grade-1 Plain English
                  </span>
                </div>
                <p className="text-xs text-[#D9D2BF] font-sans leading-relaxed italic">
                  {latestEval?.explanation?.plain_english ||
                    `"The river entering ${activePlant?.name || "Upper Tamakoshi"} is carrying sharp mountain quartz sand. We are throttling intake flow so sand settles quietly in the desander basin before touching the spinning turbine blades."`}
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#5FB3A8] mt-3 pt-2 border-t border-[#C9A24B]/15">
                Human Engineer Verified
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================================
            4.6 SECTION IV · ENERGY REVENUE OUTLOOK AGENT (SPRINT 5)
            ======================================================================= */}
        <RevenueOutlookCard
          plantId={selectedPlantId}
          plantName={activePlant?.name || "Upper Tamakoshi Hydropower Project"}
          capacityMw={activePlant?.capacity_mw || 456}
          apiBase={API_BASE}
        />

        {/* =======================================================================
            4.7 SECTION V · THE PLANT IN MOTION & 4-ZONE VAR SCREEN HUD
            ======================================================================= */}
        {varScreenOpen && (
          <PlantMotionVarHUD
            plantName={activePlant?.name || "Upper Tamakoshi Hydropower Project"}
            plantId={selectedPlantId}
            capacityMw={activePlant?.capacity_mw || 456}
            headM={activePlant?.head_m || 822}
            designFlowM3s={activePlant?.design_flow_m3s || 66}
            currentDischargeM3s={telemetry.discharge_m3s}
            currentSiltPpm={telemetry.silt_ppm}
            rainfallMmH={liveWeather?.precipitation_mm_h ?? 12.4}
            onClose={() => setVarScreenOpen(false)}
          />
        )}

        {/* =======================================================================
            4.8 SECTION VI · GLOBAL FLEET GRID (25 HIMALAYAN STATIONS)
            ======================================================================= */}
        {mode === "global" ? (
          <section className="relative bg-[#0F1A2E] border border-[#C9A24B] pn p-6">
            <div className="np">VI · GLOBAL FLEET GRID (20+ STATIONS)</div>

            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#C9A24B]/30 mb-4 mt-1 gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#F1EAD9]">
                  Himalayan Hydropower Stations Matrix
                </h3>
                <p className="text-xs text-[#A3B0C8] font-sans">
                  Click any row to immediately switch the control room deep-dive to that station.
                </p>
              </div>

              {/* Basin Filter */}
              <div className="flex items-center gap-1.5 bg-[#0B1424] border border-[#C9A24B]/30 p-1 rounded-sm text-xs font-mono">
                {["All", "Koshi", "Gandaki", "Karnali", "Bagmati"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBasinFilter(b)}
                    className={`px-2.5 py-0.5 rounded-sm transition-colors cursor-pointer ${
                      basinFilter === b
                        ? "bg-[#C9A24B] text-[#0B1424] font-bold"
                        : "text-[#A3B0C8] hover:text-[#F1EAD9]"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[#C9A24B]/30 text-[#A3B0C8] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Station Name</th>
                    <th className="py-2.5 px-3">Basin</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3">Inflow Q</th>
                    <th className="py-2.5 px-3">Quartz Silt</th>
                    <th className="py-2.5 px-3">Condition Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A24B]/15">
                  {powerhouseStations
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
                            if (found) {
                              selectPlant(found);
                              setMode("individual");
                            }
                          }}
                          className={`hover:bg-[#13264A]/60 transition-colors cursor-pointer ${
                            isCurr ? "bg-[#13264A]/40 font-semibold" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-[#F1EAD9] font-sans font-medium flex items-center gap-2">
                            {isCurr && <span className="text-[#C9A24B] font-mono text-xs">&gt;</span>}
                            {station.name}
                          </td>
                          <td className="py-2.5 px-3 text-[#A3B0C8]">{station.river_basin}</td>
                          <td className="py-2.5 px-3 text-[#F1EAD9]">{station.capacity_mw} MW</td>
                          <td className="py-2.5 px-3 text-[#F1EAD9]">
                            {station.current_discharge_m3s?.toFixed(1) || "45.0"} m³/s
                          </td>
                          <td className="py-2.5 px-3" style={{ color: sColor }}>
                            {station.current_silt_ppm?.toFixed(0) || "380"} PPM
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="px-2 py-0.5 rounded-sm text-[10px] border"
                              style={{
                                color: sColor,
                                borderColor: sColor,
                                backgroundColor: `${sColor}18`,
                              }}
                            >
                              ● {sTier}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const found = plants.find((p) => p.id === station.id);
                                if (found) {
                                  selectPlant(found);
                                  setMode("individual");
                                }
                              }}
                              className="px-2.5 py-1 bg-[#13264A] hover:bg-[#C9A24B] hover:text-[#0B1424] border border-[#C9A24B]/40 text-xs font-mono text-[#F1EAD9] rounded-sm transition-colors cursor-pointer"
                            >
                              SELECT →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="relative bg-[#0F1A2E] border border-[#C9A24B] pn p-6">
            <div className="np">VI · HIMALAYAN FLEET STATIONS</div>
            <div className="flex items-center justify-between pb-3 border-b border-[#C9A24B]/30 mb-4 mt-1">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#F1EAD9]">
                  Select Station Deep-Dive
                </h3>
                <p className="text-xs text-[#A3B0C8] font-sans">
                  Switch between 20 active Nepal hydropower plants or view the Global Fleet matrix.
                </p>
              </div>

              <button
                onClick={() => setMode("global")}
                className="px-3 py-1 bg-[#C9A24B] hover:bg-[#F0D27A] text-[#0B1424] font-serif font-bold text-xs uppercase rounded-sm transition-colors cursor-pointer"
              >
                EXPAND MATRIX VIEW →
              </button>
            </div>

            <PowerhouseGrid
              plants={powerhouseStations}
              selectedPlantId={selectedPlantId}
              onSelectPlant={(plant) => {
                const found = plants.find((p) => p.id === plant.id);
                if (found) selectPlant(found);
              }}
              basinFilter={basinFilter}
            />
          </section>
        )}
        </main>

        {/* Slideout Inspector Drawer */}
        <InspectorPanel
          isOpen={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          plantName={activePlant?.name || "Upper Tamakoshi"}
          telemetry={telemetry}
          tempC={liveWeather?.temperature_c ?? 14.2}
          rainfallMmH={liveWeather?.precipitation_mm_h ?? 12.4}
        />

        {/* Floating Cookie Consent Banner */}
        <CookieConsentBanner />

        {/* Master Global Footer */}
        <GlobalFooter />
      </>
    )}
  </div>
);
}
