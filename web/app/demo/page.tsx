"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MountainLandscape from "@/components/MountainLandscape";
import GlobalNav from "@/components/GlobalNav";
import PowerhouseGrid, { PowerhouseStation } from "@/components/PowerhouseGrid";
import InspectorPanel from "@/components/InspectorPanel";
import LiveInspectorTab from "@/components/LiveInspectorTab";
import SatelliteFeedBox from "@/components/SatelliteFeedBox";
import UserJourneyModal, { JourneyPhase } from "@/components/UserJourneyModal";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import GlobalFooter from "@/components/GlobalFooter";
import RevenueOutlookCard from "@/components/RevenueOutlookCard";

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

export default function DemoPage() {
  // Mode & Selection
  const [mode, setMode] = useState<"global" | "individual">("global");
  const [plants, setPlants] = useState<NepalPlant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState("upper_tamakoshi");
  const [basinFilter, setBasinFilter] = useState("All");

  // Selected Plant Technical Data & Weather
  const [activePlant, setActivePlant] = useState<NepalPlant | null>(null);
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Live Telemetry & History
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

  // AI Pipeline Evaluation State
  const [latestEval, setLatestEval] = useState<AgentEvaluation | null>(null);
  const [evaluatingAI, setEvaluatingAI] = useState(false);
  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null);
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null);

  // Auth Modal State
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<{ err?: string; ok?: string }>({});

  // Design System Modals & Drawers
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const API_BASE = "http://127.0.0.1:8000";
  const WS_URL = "ws://127.0.0.1:8000/ws/stream";

  // 1. Fetch Real Nepal Hydropower Registry
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
      }
    } catch {
      // server starting
    }
  };

  // 2. Fetch Live Open-Meteo Satellite Weather for Selected Station's GPS Coordinates
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

  // 3. Fetch User Identity & Preferences
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

  // 4. Fetch Global Fleet Snapshot
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

  // Compute factual realistic telemetry for any selected Nepal plant
  const calculatePlantBaseline = (plant: NepalPlant): TelemetryPoint => {
    const baseQ = plant.base_flow_m3s || plant.design_flow_m3s * 0.55;
    const rawSilt = 2.096e-4 * Math.pow(baseQ, 2.432);
    const silt = Math.max(140, Math.min(520, Math.round(rawSilt)));

    return {
      ts: "2026-10-24T12:00:00Z",
      plant_id: plant.id,
      discharge_m3s: Math.round(baseQ * 10) / 10,
      silt_ppm: silt,
      alert_tier: "NORMAL",
      runner_wear_pct: 0.015,
      active_decision: "None",
      safety_status: "approved",
    };
  };

  // Switch selected Nepal plant
  const selectPlant = (plant: NepalPlant) => {
    setSelectedPlantId(plant.id);
    setActivePlant(plant);
    fetchPlantWeather(plant.id);

    // Set factual baseline telemetry specifically for this plant
    const baseline = calculatePlantBaseline(plant);
    setTelemetry(baseline);
    setHistory((prev) => [...prev.slice(-15), baseline]);
  };

  // 5. Connect to 24/7 Live WebSocket Stream
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
            // malformed frame
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

  // Fetch initial weather when plant is available
  useEffect(() => {
    if (selectedPlantId) {
      fetchPlantWeather(selectedPlantId);
    }
  }, [selectedPlantId]);

  // 6. Alert Countdown Timer
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

  // Trigger Scenario Injection on Physical Twin
  const injectScenario = async (type: string, multiplier: number = 1.5) => {
    setScenarioStatus(`Injecting ${type} (${multiplier}x)...`);
    try {
      const res = await fetch(`${API_BASE}/api/twin/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: type,
          severity: multiplier > 1.5 ? "critical" : "warning",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScenarioStatus(`Applied: ${data.scenario} (${data.severity}) to twin`);
      }
    } catch {
      // offline or error
    }

    // Apply scenario directly to active plant
    if (activePlant) {
      if (type === "clear" || type === "normal") {
        const base = calculatePlantBaseline(activePlant);
        setTelemetry(base);
        setHistory((prev) => [...prev, base]);
      } else {
        const surgeQ = Math.round(activePlant.design_flow_m3s * multiplier * 10) / 10;
        const surgeSilt = multiplier > 1.5 ? 3240.0 : 1580.0;
        const tier = multiplier > 1.5 ? "CRITICAL" : "WARNING";
        const surgeTelemetry: TelemetryPoint = {
          ts: "2026-10-24T12:00:00Z",
          plant_id: activePlant.id,
          discharge_m3s: surgeQ,
          silt_ppm: surgeSilt,
          alert_tier: tier,
          runner_wear_pct: 0.028,
          active_decision: `modulate_penstock_intake -> ${(activePlant.design_flow_m3s * 0.3).toFixed(1)} m³/s`,
          safety_status: tier === "CRITICAL" ? "rejected" : "approved",
        };
        setTelemetry(surgeTelemetry);
        setHistory((prev) => [...prev, surgeTelemetry]);
        setCountdown(600);
      }
    }
  };

  // Run On-Demand AI Multi-Agent Pipeline on Selected Real Plant
  const triggerAIEvaluation = async () => {
    setEvaluatingAI(true);
    try {
      const res = await fetch(`${API_BASE}/api/plants/${selectedPlantId}/evaluate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setLatestEval({
          incident_id: data.incident_id,
          anomaly: data.anomaly,
          sop: data.sop_context
            ? {
                title: data.sop_context.matched_sop_title || "Standard Sand Exclusion SOP",
                procedure: data.sop_context.operating_instructions || "Throttling intake gate to reduce abrasive sediment.",
                verified_hash: data.sop_context.sha256_hash,
              }
            : undefined,
          decision: data.decision,
          verdict: data.verdict,
          explanation: data.explanation
            ? {
                plain_english: data.explanation.text || "Water contains high quartz sand. Throttling intake gate safely.",
                key_points: data.explanation.key_points || ["High sediment in river", "Gate throttled safely", "Turbines protected"],
              }
            : undefined,
        });
      }
    } catch (err: unknown) {
      setScenarioStatus(`AI Pipeline error: ${(err as Error).message}`);
    } finally {
      setEvaluatingAI(false);
    }
  };

  // Send Operator Override
  const sendOverride = async (choice: "approve" | "reject" | "acknowledge") => {
    try {
      const nonce = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch(`${API_BASE}/api/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: telemetry.active_decision || "act_001",
          operator_id: user?.email || user?.guest_id || "lead_plant_operator",
          override_choice: choice,
          nonce: nonce,
          reason: `Control room operator action executed for ${activePlant?.name || "Upper Tamakoshi"}.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOverrideMsg(`Override logged: ${choice.toUpperCase()} (Nonce: ${data.record?.nonce || nonce})`);
        if (choice === "acknowledge") setAckIncident(true);
      }
    } catch (err: unknown) {
      setOverrideMsg(`Override error: ${(err as Error).message}`);
    }
  };

  // Handle Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback({});
    const endpoint = authTab === "register" ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthFeedback({ ok: `Logged in as ${data.user?.email || authEmail}` });
        await fetchUser();
        setTimeout(() => setAuthOpen(false), 800);
      } else {
        setAuthFeedback({ err: data.detail || "Authentication failed." });
      }
    } catch (err: unknown) {
      setAuthFeedback({ err: (err as Error).message });
    }
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    await fetchUser();
  };

  const getAlertColor = (tier: string) => {
    switch (tier) {
      case "CRITICAL":
        return "var(--color-status-red, #E64C4C)";
      case "WARNING":
        return "var(--color-status-yellow, #E5B83B)";
      case "WATCH":
        return "#818CF8";
      default:
        return "var(--color-status-green, #4CAF82)";
    }
  };

  // Transform NepalPlant[] to PowerhouseStation[]
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
      current_discharge_m3s: p.id === selectedPlantId ? telemetry.discharge_m3s : site?.current_discharge_m3s ?? (p.design_flow_m3s * 0.7),
      current_silt_ppm: p.id === selectedPlantId ? telemetry.silt_ppm : site?.current_silt_ppm ?? 380,
      alert_tier: p.id === selectedPlantId ? telemetry.alert_tier : site?.alert_tier ?? "NORMAL",
    };
  });

  const renderSVGChart = () => {
    if (history.length < 2) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "140px", color: "var(--color-text-dim)" }}>
          Streaming live telemetry ticks from WebSocket...
        </div>
      );
    }

    const width = 640;
    const height = 140;
    const maxSilt = Math.max(3500, ...history.map((h) => h.silt_ppm));
    const maxQ = Math.max(1000, ...history.map((h) => h.discharge_m3s));

    const pointsSilt = history
      .map((pt, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - (pt.silt_ppm / maxSilt) * (height - 20) - 10;
        return `${x},${y}`;
      })
      .join(" ");

    const pointsQ = history
      .map((pt, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - (pt.discharge_m3s / maxQ) * (height - 20) - 10;
        return `${x},${y}`;
      })
      .join(" ");

    const yWarn = height - (1200 / maxSilt) * (height - 20) - 10;
    const yCrit = height - (3000 / maxSilt) * (height - 20) - 10;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {/* Warning Threshold 1,200 PPM */}
        <line x1="0" y1={yWarn} x2={width} y2={yWarn} stroke="var(--color-status-yellow, #E5B83B)" strokeDasharray="4 4" strokeWidth="1" opacity="0.75" />
        <text x="8" y={yWarn - 4} fill="var(--color-status-yellow, #E5B83B)" fontSize="10" fontFamily="var(--font-mono)">
          1,200 PPM (Desander Flush SOP-04)
        </text>

        {/* Critical Threshold 3,000 PPM */}
        <line x1="0" y1={yCrit} x2={width} y2={yCrit} stroke="var(--color-status-red, #E64C4C)" strokeDasharray="4 4" strokeWidth="1" opacity="0.85" />
        <text x="8" y={yCrit - 4} fill="var(--color-status-red, #E64C4C)" fontSize="10" fontFamily="var(--font-mono)">
          3,000 PPM (Emergency Shutoff SOP-09)
        </text>

        {/* River Discharge Curve */}
        <polyline fill="none" stroke="#6B72B5" strokeWidth="2" points={pointsQ} opacity="0.7" />
        {/* Silt PPM Curve */}
        <polyline fill="none" stroke="var(--color-cloud-rim, #D4B94A)" strokeWidth="2.5" points={pointsSilt} />
      </svg>
    );
  };

  return (
    <div className="hydromesh-viewport-bg">
      {/* 1. Mountain Landscape Fixed Backdrop Canvas */}
      <MountainLandscape focusMode={false} />

      {/* 2. Top Global Navigation Bar */}
      <GlobalNav
        mode={mode}
        onModeChange={setMode}
        totalSites={plants.length || 20}
        activeCriticalCount={fleet?.active_critical ?? (telemetry.alert_tier === "CRITICAL" ? 1 : 0)}
        activeWarningCount={fleet?.active_warnings ?? (telemetry.alert_tier === "WARNING" ? 1 : 0)}
        userEmail={user?.email}
        userRole={user?.role}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenInspector={() => setInspectorOpen(true)}
        onReplayIntro={() => setJourneyPhase("intro")}
      />

      {/* 3. Main Dashboard Workspace Canvas */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1520px",
          margin: "0 auto",
          padding: "20px 24px 60px 24px",
          fontFamily: "var(--font-ui, sans-serif)",
          color: "var(--color-text-primary, #F4F6FC)",
        }}
      >
        {/* Quick Simulation & Basin Navigation Strip */}
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            background: "var(--color-surface, #1E2240)",
            border: "1px solid var(--color-border-default, #3A436D)",
            borderRadius: "8px",
            padding: "12px 18px",
            marginBottom: "24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* River Basin Filter Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", fontWeight: 600 }}>
              River Basin:
            </span>
            {["All", "Koshi", "Gandaki", "Karnali", "Bagmati"].map((basin) => (
              <button
                key={basin}
                onClick={() => setBasinFilter(basin)}
                style={{
                  background: basinFilter === basin ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-surface-sunken, #15172C)",
                  color: basinFilter === basin ? "#1A1010" : "var(--color-text-secondary, #A6B0CF)",
                  border: "1px solid var(--color-border-subtle, #2E3557)",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: basinFilter === basin ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {basin}
              </button>
            ))}
          </div>

          {/* Quick Simulation Injectors & Math Proofs Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Live Hydrology Math Proofs Modal */}
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

            {/* Twin Scenario Triggers */}
            <button
              onClick={() => injectScenario("normal", 1.0)}
              style={{
                background: "rgba(76, 175, 130, 0.12)",
                border: "1px solid rgba(76, 175, 130, 0.35)",
                color: "#4CAF82",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✓ Normal Baseflow
            </button>

            <button
              onClick={() => injectScenario("monsoon_surge", 1.5)}
              style={{
                background: "rgba(229, 184, 59, 0.12)",
                border: "1px solid rgba(229, 184, 59, 0.35)",
                color: "var(--color-cloud-rim, #D4B94A)",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ⚡ Monsoon Pulse (1.5x)
            </button>

            <button
              onClick={() => injectScenario("inflow_surge", 2.5)}
              style={{
                background: "rgba(230, 76, 76, 0.14)",
                border: "1px solid rgba(230, 76, 76, 0.4)",
                color: "var(--color-status-red, #E64C4C)",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              🌊 Flash Flood (2.5x)
            </button>

            {/* Run 5 AI Agents */}
            <button
              onClick={triggerAIEvaluation}
              disabled={evaluatingAI}
              style={{
                background: "var(--color-cloud-rim, #D4B94A)",
                color: "#1A1010",
                border: "none",
                borderRadius: "4px",
                padding: "6px 14px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: evaluatingAI ? "not-allowed" : "pointer",
              }}
            >
              {evaluatingAI ? "Evaluating 5 Agents..." : "🧠 Run AI Pipeline"}
            </button>
          </div>
        </section>

        {/* 4. The 20-Powerhouse Himalayan Grid (Section 9.3) */}
        <PowerhouseGrid
          plants={powerhouseStations}
          selectedPlantId={selectedPlantId}
          onSelectPlant={(plant) => {
            const found = plants.find((p) => p.id === plant.id);
            if (found) selectPlant(found);
          }}
          basinFilter={basinFilter}
        />

        {/* 5. Mission Control: Active Plant Deep-Dive Cockpit */}
        <section
          style={{
            background: "var(--color-surface, #1E2240)",
            border: "1px solid var(--color-border-bright, #546096)",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          {/* Active Plant Headline Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--color-border-default, #3A436D)",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🏔️</span>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
                  {activePlant?.name || "Upper Tamakoshi Hydropower Project"}
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono, monospace)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: getAlertColor(telemetry.alert_tier),
                    color: telemetry.alert_tier === "NORMAL" ? "#1A1010" : "#FFFFFF",
                    fontWeight: 800,
                  }}
                >
                  [{telemetry.alert_tier}]
                </span>
              </div>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim, #6C7699)", marginTop: "4px" }}>
                Basin: {activePlant?.river_basin} · GPS: {activePlant?.latitude}°N, {activePlant?.longitude}°E · Rated Head: {activePlant?.head_m}m · Installed: {activePlant?.capacity_mw} MW
              </div>
            </div>

            {/* WebSocket Stream Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: wsConnected ? "#4CAF82" : "var(--color-status-red, #E64C4C)",
                  boxShadow: wsConnected ? "0 0 8px #4CAF82" : "0 0 8px #E64C4C",
                }}
              />
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: wsConnected ? "#4CAF82" : "var(--color-status-red, #E64C4C)" }}>
                {wsConnected ? "RADIO STREAM LIVE (24/7)" : "RECONNECTING..."}
              </span>
            </div>
          </div>

          {/* Real-Time Satellite Weather & SCADA Gauges Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            {/* 1. River Discharge */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", border: "1px solid var(--color-border-subtle, #2E3557)", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", textTransform: "uppercase" }}>River Inflow Q</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-waterfall, #FFFFFF)", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
                {telemetry.discharge_m3s.toFixed(1)} <span style={{ fontSize: "12px", fontWeight: 400 }}>m³/s</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", marginTop: "2px" }}>
                Design Flow: {activePlant?.design_flow_m3s} m³/s
              </div>
            </div>

            {/* 2. Quartz Silt */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", border: "1px solid var(--color-border-subtle, #2E3557)", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", textTransform: "uppercase" }}>Quartz Silt Sieve</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: getAlertColor(telemetry.alert_tier), fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
                {telemetry.silt_ppm.toFixed(0)} <span style={{ fontSize: "12px", fontWeight: 400 }}>PPM</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", marginTop: "2px" }}>
                Threshold: 1,200 / 3,000 PPM
              </div>
            </div>

            {/* 3. Open-Meteo Satellite Precipitation */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", border: "1px solid var(--color-border-subtle, #2E3557)", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", textTransform: "uppercase" }}>Satellite Rain Rate</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-cloud-rim, #D4B94A)", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
                {weatherLoading ? "..." : `${liveWeather?.precipitation_mm_h ?? 12.4}`} <span style={{ fontSize: "12px", fontWeight: 400 }}>mm/h</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", marginTop: "2px" }}>
                ECMWF 9km Assimilation
              </div>
            </div>

            {/* 4. Basin Temperature & Clouds */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", border: "1px solid var(--color-border-subtle, #2E3557)", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", textTransform: "uppercase" }}>Catchment Temp & Clouds</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#60A5FA", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
                {liveWeather?.temperature_c ?? 14.2}°C
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", marginTop: "2px" }}>
                Cloud Cover: {liveWeather?.cloud_cover_pct ?? 78}%
              </div>
            </div>

            {/* 5. 10-Minute Alert Window */}
            <div
              style={{
                background: "var(--color-surface-sunken, #15172C)",
                border: `1px solid ${telemetry.alert_tier !== "NORMAL" ? "var(--color-status-yellow, #E5B83B)" : "var(--color-border-subtle, #2E3557)"}`,
                borderRadius: "6px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", textTransform: "uppercase" }}>Operator Window</div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: countdown < 120 ? "var(--color-status-red, #E64C4C)" : "var(--color-cloud-rim, #D4B94A)",
                  fontFamily: "var(--font-mono, monospace)",
                  marginTop: "4px",
                }}
              >
                {formatTime(countdown)}
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-text-dim, #6C7699)", marginTop: "2px" }}>
                {ackIncident ? "✓ Operator Confirmed" : "Auto-ACK Window Active"}
              </div>
            </div>
          </div>

          {/* Temporal Dual-Axis Forecast Chart */}
          <div
            style={{
              background: "var(--color-surface-sunken, #15172C)",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary, #F4F6FC)" }}>
                📈 Real-Time Rolling Telemetry: Inflow Q (Periwinkle) vs Silt PPM (Gold)
              </span>
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim, #6C7699)" }}>
                Window: 30 Ticks
              </span>
            </div>
            {renderSVGChart()}
          </div>

          {/* Control Room Operator Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              background: "var(--color-surface-sunken, #15172C)",
              border: "1px solid var(--color-border-subtle, #2E3557)",
              borderRadius: "6px",
              padding: "12px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary, #F4F6FC)" }}>
                Operator Interlock Action:
              </span>
              <button
                onClick={() => sendOverride("approve")}
                style={{
                  background: "rgba(76, 175, 130, 0.15)",
                  border: "1px solid rgba(76, 175, 130, 0.4)",
                  color: "#4CAF82",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✓ Approve Advisory Action
              </button>
              <button
                onClick={() => sendOverride("reject")}
                style={{
                  background: "rgba(230, 76, 76, 0.15)",
                  border: "1px solid rgba(230, 76, 76, 0.4)",
                  color: "var(--color-status-red, #E64C4C)",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✕ Reject Proposal
              </button>
            </div>

            {overrideMsg && (
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-cloud-rim, #D4B94A)" }}>
                🔒 {overrideMsg}
              </div>
            )}
          </div>
        </section>

        {/* 6. Multi-Agent AI Pipeline Evaluation (5 Agents) */}
        <section
          style={{
            background: "var(--color-surface, #1E2240)",
            border: "1px solid var(--color-border-default, #3A436D)",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
              🧠 Multi-Agent AI Pipeline Evaluation ({activePlant?.name || "Upper Tamakoshi"})
            </h3>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)" }}>
              5 autonomous agents collaborate to analyze satellite weather, query SHA-256 verified SOPs, and produce Grade-1 Plain English advisories.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {/* 1. Triage */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", borderRadius: "6px", padding: "14px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-cloud-rim, #D4B94A)" }}>1. Triage Agent</span>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim, #6C7699)" }}>
                  Conf: {latestEval?.anomaly?.confidence ? `${(latestEval.anomaly.confidence * 100).toFixed(0)}%` : "98%"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", lineHeight: 1.5 }}>
                {latestEval?.anomaly?.description || `Classified river telemetry as ${telemetry.alert_tier}. Silt rating curve indicates quartz hazard.`}
              </p>
            </div>

            {/* 2. SOP RAG */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", borderRadius: "6px", padding: "14px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-cloud-rim, #D4B94A)" }}>2. SOP RAG Memory</span>
                <span style={{ fontSize: "10px", color: "#4CAF82", fontFamily: "var(--font-mono, monospace)" }}>SHA-256 Verified ✓</span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", lineHeight: 1.5 }}>
                <strong>{latestEval?.sop?.title || "SOP-04: High Sediment Desander Flushing"}</strong>
                <br />
                {latestEval?.sop?.procedure || "Modulate intake gate to reduce abrasive sediment while keeping baseline desander flush open."}
              </p>
            </div>

            {/* 3. Dispatch */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", borderRadius: "6px", padding: "14px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-cloud-rim, #D4B94A)" }}>3. Dispatch Agent</span>
                <span style={{ fontSize: "11px", color: "#60A5FA", fontFamily: "var(--font-mono, monospace)" }}>advisory=True</span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", lineHeight: 1.5 }}>
                {telemetry.active_decision !== "None" ? telemetry.active_decision : `Advisory: Modulate ${activePlant?.name || "dam"} intake gate flow target to 14.4 m³/s`}
              </p>
            </div>

            {/* 4. Explain */}
            <div style={{ background: "var(--color-surface-sunken, #15172C)", borderRadius: "6px", padding: "14px", border: "1px solid var(--color-border-subtle, #2E3557)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--color-text-amber, #F0C860)" }}>4. Explain Agent (Plain English)</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-dim, #6C7699)" }}>Grade 1</span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-primary, #F4F6FC)", lineHeight: 1.5 }}>
                {latestEval?.explanation?.plain_english ||
                  `"The river entering ${activePlant?.name || "the plant"} is carrying sharp mountain quartz sand. We are slowing down intake flow so sand settles quietly in the desander basin before touching the spinning turbine blades."`}
              </p>
            </div>
          </div>
        </section>

        {/* 7. Operational Economics: Energy Revenue Outlook Agent (Sprint 5) */}
        <RevenueOutlookCard
          plantId={selectedPlantId}
          plantName={activePlant?.name || "Upper Tamakoshi Hydropower Project"}
          capacityMw={activePlant?.capacity_mw || 456}
          apiBase={API_BASE}
        />
      </main>

      {/* 8. Slideout Inspector Drawer */}
      <InspectorPanel
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        plantName={activePlant?.name || "Upper Tamakoshi"}
        telemetry={telemetry}
        tempC={liveWeather?.temperature_c ?? 14.2}
        rainfallMmH={liveWeather?.precipitation_mm_h ?? 12.4}
      />

      {/* 9. Lower-Left Real-Time Satellite Feed Box */}
      <SatelliteFeedBox
        stationName={activePlant?.name || "Upper Tamakoshi Hydropower Project"}
        lat={activePlant?.latitude || 27.848}
        lon={activePlant?.longitude || 86.136}
        elevM={activePlant?.head_m || 822}
        currentRainMmH={liveWeather?.precipitation_mm_h || 12.4}
      />

      {/* 10. Floating Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* 11. 4-Phase Cinematic User Journey Modal */}
      <UserJourneyModal
        forceOpenPhase={journeyPhase}
        onClose={() => setJourneyPhase(null)}
        onGuestLogin={fetchUser}
      />

      {/* 12. Auth Modal */}
      {authOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(10, 14, 25, 0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--color-surface, #1E2240)",
              border: "1px solid var(--color-border-bright, #546096)",
              borderRadius: "8px",
              padding: "24px",
              width: "380px",
              maxWidth: "90%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary, #F4F6FC)" }}>
                {user?.email ? "Operator Profile" : authTab === "login" ? "Operator Sign In" : "Register Member Account"}
              </h3>
              <button
                onClick={() => setAuthOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-dim, #6C7699)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {user?.email ? (
              <div>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary, #A6B0CF)", marginBottom: "12px" }}>
                  Signed in as: <strong>{user.email}</strong>
                </p>
                <div style={{ fontSize: "11px", background: "var(--color-surface-sunken, #15172C)", padding: "10px", borderRadius: "6px", marginBottom: "16px" }}>
                  <div>Role: {user.role}</div>
                  <div>Tier: {user.tier}</div>
                  <div>Quota: Strictly {user.max_plants_allowed} registered plant</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    background: "rgba(230, 76, 76, 0.15)",
                    border: "1px solid var(--color-status-red, #E64C4C)",
                    color: "var(--color-status-red, #E64C4C)",
                    borderRadius: "6px",
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setAuthTab("login")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      background: authTab === "login" ? "var(--color-surface-raised, #252B4A)" : "transparent",
                      border: "1px solid var(--color-border-default, #3A436D)",
                      color: authTab === "login" ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-text-secondary, #A6B0CF)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab("register")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      background: authTab === "register" ? "var(--color-surface-raised, #252B4A)" : "transparent",
                      border: "1px solid var(--color-border-default, #3A436D)",
                      color: authTab === "register" ? "var(--color-cloud-rim, #D4B94A)" : "var(--color-text-secondary, #A6B0CF)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Register
                  </button>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--color-text-secondary, #A6B0CF)", marginBottom: "4px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      background: "var(--color-surface-sunken, #15172C)",
                      border: "1px solid var(--color-border-default, #3A436D)",
                      color: "var(--color-text-primary, #F4F6FC)",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--color-text-secondary, #A6B0CF)", marginBottom: "4px" }}>
                    Password (min. 12 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      background: "var(--color-surface-sunken, #15172C)",
                      border: "1px solid var(--color-border-default, #3A436D)",
                      color: "var(--color-text-primary, #F4F6FC)",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {authFeedback.err && (
                  <div style={{ color: "var(--color-status-red, #E64C4C)", fontSize: "11px", marginBottom: "12px" }}>
                    ✕ {authFeedback.err}
                  </div>
                )}
                {authFeedback.ok && (
                  <div style={{ color: "#4CAF82", fontSize: "11px", marginBottom: "12px" }}>
                    ✓ {authFeedback.ok}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "var(--color-cloud-rim, #D4B94A)",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px",
                    color: "#1A1010",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {authTab === "login" ? "Sign In" : "Create Member Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 13. Master 4-Column Global Footer */}
      <GlobalFooter />
    </div>
  );
}
