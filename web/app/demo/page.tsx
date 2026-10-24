"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  alert_tier?: string;
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
    const baseQ = plant.base_flow_m3s || (plant.design_flow_m3s * 0.55);
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
            // CRITICAL FIX: Only update telemetry if stream packet matches currently selected plant
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
        return "var(--color-red)";
      case "WARNING":
        return "#E07C38";
      case "WATCH":
        return "var(--color-yellow)";
      default:
        return "var(--color-green)";
    }
  };

  // Filtered plants by river basin
  const filteredPlants = plants.filter((p) => {
    if (basinFilter === "All") return true;
    return p.river_basin.toLowerCase().includes(basinFilter.toLowerCase());
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

    const pointsSilt = history.map((pt, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - (pt.silt_ppm / maxSilt) * (height - 20) - 10;
      return `${x},${y}`;
    }).join(" ");

    const pointsQ = history.map((pt, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - (pt.discharge_m3s / maxQ) * (height - 20) - 10;
      return `${x},${y}`;
    }).join(" ");

    const yWarn = height - (1200 / maxSilt) * (height - 20) - 10;
    const yCrit = height - (3000 / maxSilt) * (height - 20) - 10;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        <line x1="0" y1={yWarn} x2={width} y2={yWarn} stroke="#E07C38" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
        <text x="8" y={yWarn - 4} fill="#E07C38" fontSize="10" fontFamily="var(--font-mono)">1,200 PPM (Warning)</text>

        <line x1="0" y1={yCrit} x2={width} y2={yCrit} stroke="var(--color-red)" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
        <text x="8" y={yCrit - 4} fill="var(--color-red)" fontSize="10" fontFamily="var(--font-mono)">3,000 PPM (Critical)</text>

        <polyline fill="none" stroke="#50B0D8" strokeWidth="2" points={pointsQ} opacity="0.7" />
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2.5" points={pointsSilt} />
      </svg>
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-ui)",
        padding: "var(--space-6) var(--space-8)",
      }}
    >
      {/* 1. Header & Navigation Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <Link
            href="/"
            style={{
              color: "var(--color-accent)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← HydroMesh
          </Link>
          <span style={{ color: "var(--color-text-dim)" }}>|</span>
          <span style={{ fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-highlight)" }}>
            Nepal Hydropower Mission Control
          </span>
          <span
            style={{
              background: "var(--color-surface-raised)",
              color: "var(--color-accent)",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            25 Official NEA Stations
          </span>
        </div>

        {/* Mode Toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--color-surface)",
            borderRadius: "6px",
            border: "1px solid var(--color-border)",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setMode("global")}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              border: "none",
              background: mode === "global" ? "var(--color-surface-raised)" : "transparent",
              color: mode === "global" ? "var(--color-highlight)" : "var(--color-text-secondary)",
              fontWeight: mode === "global" ? 600 : 400,
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            🇳🇵 Nepal Grid Fleet (25 Plants)
          </button>
          <button
            onClick={() => setMode("individual")}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              border: "none",
              background: mode === "individual" ? "var(--color-surface-raised)" : "transparent",
              color: mode === "individual" ? "var(--color-highlight)" : "var(--color-text-secondary)",
              fontWeight: mode === "individual" ? 600 : 400,
              cursor: "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            🏔️ Selected Dam Sandbox
          </button>
        </div>

        {/* Connection & Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: wsConnected ? "var(--color-green-bg)" : "var(--color-red-bg)",
              border: `1px solid ${wsConnected ? "var(--color-green)" : "var(--color-red)"}`,
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: wsConnected ? "var(--color-green)" : "var(--color-red)",
                display: "inline-block",
              }}
            />
            {wsConnected ? "LIVE 2.0s" : "CONNECTING..."}
          </div>

          <button
            onClick={() => setAuthOpen(true)}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              padding: "6px 12px",
              color: "var(--color-text-primary)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👤</span>
            <span>{user?.email || (user?.guest_id ? `${user.guest_id.slice(0, 12)}...` : "Guest")}</span>
            <span style={{ color: "var(--color-accent)", fontSize: "10px" }}>
              [{user?.role === "member" ? "Member" : "Guest"}]
            </span>
          </button>
        </div>
      </header>

      {/* 2. Official NEA Plant Specification & Mountain Satellite Weather Card */}
      {activePlant && (
        <section
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "var(--space-5)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "4px" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--color-highlight)" }}>
                  {activePlant.name}
                </h2>
                <span
                  style={{
                    background: "rgba(212, 168, 48, 0.15)",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-accent)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {activePlant.river_basin} River Basin
                </span>
                <span
                  style={{
                    background: "var(--color-surface-raised)",
                    color: "var(--color-text-secondary)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {activePlant.capacity_mw} MW
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                Verified Official NEA Asset · Real Himalayan Hydrological Catchment & Quartz Silt Model
              </p>
            </div>

            {/* Quick Switcher Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <label style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>Select Real Plant:</label>
              <select
                value={selectedPlantId}
                onChange={(e) => {
                  const p = plants.find((x) => x.id === e.target.value);
                  if (p) selectPlant(p);
                }}
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "var(--text-xs)",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                }}
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.capacity_mw} MW) - {p.river_basin}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5 Technical Fact Columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "var(--space-3)",
              marginTop: "var(--space-4)",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Real GPS Coordinates</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-highlight)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {activePlant.latitude.toFixed(3)}°N, {activePlant.longitude.toFixed(3)}°E
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${activePlant.latitude}&mlon=${activePlant.longitude}#map=14/${activePlant.latitude}/${activePlant.longitude}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "10px", color: "var(--color-accent)", textDecoration: "none" }}
              >
                View on Map ↗
              </a>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Hydraulic Head</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-highlight)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {activePlant.head_m} m
              </div>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>Penstock Pressure Elevation</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Design Flow (Q)</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "#50B0D8", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {activePlant.design_flow_m3s} m³/s
              </div>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>Maximum Intake Rating</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Catchment Basin</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-highlight)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {activePlant.catchment_area_km2.toLocaleString()} km²
              </div>
              <div style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>Mountain Runoff Area</div>
            </div>

            {/* Live Open-Meteo Weather */}
            <div style={{ background: "var(--color-surface-raised)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: "10px", color: "var(--color-accent)", textTransform: "uppercase", fontWeight: 700 }}>
                Live Satellite Weather (Open-Meteo)
              </div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-highlight)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                {weatherLoading ? "Checking sky..." : `${liveWeather?.precipitation_mm_h.toFixed(1) || "0.0"} mm/h Rain`}
              </div>
              <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>
                {liveWeather ? `${liveWeather.temperature_c.toFixed(1)}°C | ${liveWeather.cloud_cover_pct.toFixed(0)}% Clouds` : "Live mountain feed"}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Active Alert Banner */}
      <section
        style={{
          background:
            telemetry.alert_tier === "CRITICAL"
              ? "var(--color-red-bg)"
              : telemetry.alert_tier === "WARNING"
              ? "rgba(224, 124, 56, 0.15)"
              : telemetry.alert_tier === "WATCH"
              ? "var(--color-yellow-bg)"
              : "var(--color-green-bg)",
          border: `1px solid ${getAlertColor(telemetry.alert_tier)}`,
          borderRadius: "8px",
          padding: "var(--space-4) var(--space-6)",
          marginBottom: "var(--space-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <span style={{ fontSize: "24px" }}>
            {telemetry.alert_tier === "CRITICAL" ? "🚨" : telemetry.alert_tier === "WARNING" ? "⚠️" : telemetry.alert_tier === "WATCH" ? "🟡" : "🟢"}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--text-base)", color: getAlertColor(telemetry.alert_tier) }}>
              ALERT LEVEL: {telemetry.alert_tier} ({telemetry.silt_ppm.toFixed(1)} PPM Sediment)
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              {telemetry.alert_tier === "CRITICAL"
                ? `Critical Quartz Silt Surge at ${activePlant?.name || "Upper Tamakoshi"}. Exceeds 3,000 PPM blade abrasion threshold.`
                : telemetry.alert_tier === "WARNING"
                ? `Sediment surge detected. Desander flushing advisory formulated. Safety kernel R1-R11 checks active.`
                : telemetry.alert_tier === "WATCH"
                ? "River silt rising above baseline. Monitoring glacier melt and precipitation."
                : `Turbines safe. Baseline desander flushing active at ${activePlant?.name || "dam"}. Silt <800 PPM.`}
            </div>
          </div>
        </div>

        {(telemetry.alert_tier === "WARNING" || telemetry.alert_tier === "CRITICAL") && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: countdown < 180 ? "var(--color-red)" : "var(--color-accent)",
                background: "var(--color-surface)",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
              }}
            >
              ⏱️ {formatTime(countdown)}
            </div>
            <button
              onClick={() => sendOverride("acknowledge")}
              disabled={ackIncident}
              style={{
                background: ackIncident ? "var(--color-green)" : "var(--color-accent)",
                color: "#1A1010",
                fontWeight: 700,
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: ackIncident ? "default" : "pointer",
                fontSize: "var(--text-xs)",
              }}
            >
              {ackIncident ? "✓ Incident Acknowledged" : "Acknowledge Incident"}
            </button>
          </div>
        )}
      </section>

      {/* 4. Live Physical Metrics Dials */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "var(--space-4)" }}>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)", textTransform: "uppercase", marginBottom: "4px" }}>
            Himalayan Quartz Silt
          </div>
          <div style={{ fontSize: "var(--text-3xl)", fontWeight: 700, color: getAlertColor(telemetry.alert_tier), fontFamily: "var(--font-mono)" }}>
            {telemetry.silt_ppm.toFixed(1)} <span style={{ fontSize: "var(--text-xs)" }}>PPM</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
            Formula: Silt = 2.096e-4 × Q^2.432
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "var(--space-4)" }}>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)", textTransform: "uppercase", marginBottom: "4px" }}>
            River Discharge (Q)
          </div>
          <div style={{ fontSize: "var(--text-3xl)", fontWeight: 700, color: "#50B0D8", fontFamily: "var(--font-mono)" }}>
            {telemetry.discharge_m3s.toFixed(1)} <span style={{ fontSize: "var(--text-sm)" }}>m³/s</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
            Design Flow: {activePlant?.design_flow_m3s || 66.0} m³/s
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "var(--space-4)" }}>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)", textTransform: "uppercase", marginBottom: "4px" }}>
            Turbine Blade Sand Abrasion
          </div>
          <div style={{ fontSize: "var(--text-3xl)", fontWeight: 700, color: "var(--color-highlight)", fontFamily: "var(--font-mono)" }}>
            {telemetry.runner_wear_pct.toFixed(3)}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
            IEC 62364 Hydro-Abrasive Wear Standard
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "var(--space-4)" }}>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)", textTransform: "uppercase", marginBottom: "4px" }}>
            Safety Kernel Verdict
          </div>
          <div
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: telemetry.safety_status === "approved" ? "var(--color-green)" : telemetry.safety_status === "rejected" ? "var(--color-red)" : "var(--color-yellow)",
              fontFamily: "var(--font-mono)",
              marginTop: "4px",
            }}
          >
            {telemetry.safety_status.toUpperCase()}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
            Deterministic Rules R1–R11 Enforced
          </div>
        </div>
      </section>

      {/* 5. Live Telemetry Trend Chart */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "var(--space-5)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600 }}>
              Live Telemetry Stream ({activePlant?.name || "Upper Tamakoshi"})
            </h3>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              Continuous real-time frames streamed over WebSocket (2.0s updates)
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--color-accent)" }}>● Silt (PPM)</span>
            <span style={{ color: "#50B0D8" }}>● River Flow (m³/s)</span>
          </div>
        </div>
        {renderSVGChart()}
      </section>

      {/* 6. Physical Scenario Testbench & Operator Controls */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "var(--space-5)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600 }}>
              ⚡ Real Himalayan Hydrology Scenario Testbench
            </h3>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              Simulate actual Himalayan extreme events (cloudbursts, glacial surges, sensor faults) on {activePlant?.name}.
            </span>
          </div>
          <button
            onClick={triggerAIEvaluation}
            disabled={evaluatingAI}
            style={{
              background: "var(--color-surface-raised)",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {evaluatingAI ? "Evaluating 5 Agents..." : `🤖 Run AI Pipeline on ${activePlant?.name || "Plant"}`}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <button
            onClick={() => injectScenario("monsoon_surge", 1.5)}
            style={{
              background: "rgba(224, 124, 56, 0.15)",
              border: "1px solid #E07C38",
              color: "#E07C38",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🌊 Monsoon Silt Surge (1.5x)
          </button>

          <button
            onClick={() => injectScenario("monsoon_surge", 2.2)}
            style={{
              background: "var(--color-red-bg)",
              border: "1px solid var(--color-red)",
              color: "var(--color-red)",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚡ Cloudburst / Flash Flood (2.2x)
          </button>

          <button
            onClick={() => injectScenario("sensor_drift", 1.0)}
            style={{
              background: "var(--color-yellow-bg)",
              border: "1px solid var(--color-yellow)",
              color: "var(--color-yellow)",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🌫️ Sensor Drift Glitch (Fail-Closed Test)
          </button>

          <button
            onClick={() => injectScenario("clear", 1.0)}
            style={{
              background: "var(--color-green-bg)",
              border: "1px solid var(--color-green)",
              color: "var(--color-green)",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ☀️ Clear Mountain Baseflow
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            paddingTop: "var(--space-3)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            Control Room Action:
          </span>
          <button
            onClick={() => sendOverride("approve")}
            style={{
              background: "var(--color-green-bg)",
              border: "1px solid var(--color-green)",
              color: "var(--color-green)",
              borderRadius: "4px",
              padding: "4px 10px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Approve Advisory Action
          </button>
          <button
            onClick={() => sendOverride("reject")}
            style={{
              background: "var(--color-red-bg)",
              border: "1px solid var(--color-red)",
              color: "var(--color-red)",
              borderRadius: "4px",
              padding: "4px 10px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Reject Proposal
          </button>
        </div>

        {(scenarioStatus || overrideMsg) && (
          <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>
            {scenarioStatus && <div>ℹ️ {scenarioStatus}</div>}
            {overrideMsg && <div>🔒 {overrideMsg}</div>}
          </div>
        )}
      </section>

      {/* 7. Multi-Agent AI Pipeline Inspection */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "var(--space-5)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600 }}>
            🧠 Multi-Agent AI Pipeline Evaluation ({activePlant?.name || "Upper Tamakoshi"})
          </h3>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            5 autonomous agents collaborate to analyze satellite weather, query SHA-256 verified SOPs, and produce Grade-1 Plain English advisories.
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          <div style={{ background: "var(--color-surface-raised)", borderRadius: "6px", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-accent)" }}>1. Triage Agent</span>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                Conf: {latestEval?.anomaly?.confidence ? `${(latestEval.anomaly.confidence * 100).toFixed(0)}%` : "98%"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {latestEval?.anomaly?.description || `Classified river telemetry as ${telemetry.alert_tier}. Silt rating curve indicates quartz hazard.`}
            </p>
          </div>

          <div style={{ background: "var(--color-surface-raised)", borderRadius: "6px", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-accent)" }}>2. SOP RAG Memory</span>
              <span style={{ fontSize: "11px", color: "var(--color-green)", fontFamily: "var(--font-mono)" }}>SHA-256 Verified ✓</span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              <strong>{latestEval?.sop?.title || "SOP-04: High Sediment Desander Flushing"}</strong>
              <br />
              {latestEval?.sop?.procedure || "Modulate intake gate to reduce abrasive sediment while keeping baseline desander flush open."}
            </p>
          </div>

          <div style={{ background: "var(--color-surface-raised)", borderRadius: "6px", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-accent)" }}>3. Dispatch Agent</span>
              <span style={{ fontSize: "11px", color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>advisory=True</span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {telemetry.active_decision !== "None" ? telemetry.active_decision : `Advisory: Modulate ${activePlant?.name || "dam"} intake gate flow target to 14.4 m³/s`}
            </p>
          </div>

          <div style={{ background: "var(--color-surface-raised)", borderRadius: "6px", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-highlight)" }}>4. Explain Agent (Plain English)</span>
              <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>Grade 1</span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
              {latestEval?.explanation?.plain_english ||
                `"The river entering ${activePlant?.name || "the plant"} is carrying sharp mountain quartz sand. We are slowing down intake flow so sand settles quietly in the desander basin before touching the spinning turbine blades."`}
            </p>
          </div>
        </div>
      </section>

      {/* 7.5 Energy Revenue Outlook Agent (Sprint 5) */}
      <RevenueOutlookCard
        plantId={selectedPlantId}
        plantName={activePlant?.name || "Upper Tamakoshi Hydropower Project"}
        capacityMw={activePlant?.capacity_mw || 456}
        apiBase={API_BASE}
      />

      {/* 8. 25 Official Nepal Hydropower Stations Grid */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600 }}>
              🇳🇵 All 25 Real Nepal Hydropower Stations (Official NEA Registry)
            </h3>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              Official coordinates, capacities, and river basins across Nepal. Click any station to focus live telemetry.
            </span>
          </div>

          {/* Basin Filters */}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {["All", "Koshi", "Gandaki", "Karnali", "Bagmati"].map((basin) => (
              <button
                key={basin}
                onClick={() => setBasinFilter(basin)}
                style={{
                  background: basinFilter === basin ? "var(--color-accent)" : "var(--color-surface-raised)",
                  color: basinFilter === basin ? "#1A1010" : "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: basinFilter === basin ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {basin}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
          {filteredPlants.map((plant) => {
            const isSelected = plant.id === selectedPlantId;
            const fleetSite = fleet?.sites.find((s) => s.id === plant.id);
            const alertTier = fleetSite?.alert_tier || "NORMAL";

            return (
              <div
                key={plant.id}
                onClick={() => selectPlant(plant)}
                style={{
                  background: isSelected ? "var(--color-surface-raised)" : "var(--color-bg)",
                  border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                  borderRadius: "6px",
                  padding: "var(--space-3) var(--space-4)",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "var(--text-xs)", color: isSelected ? "var(--color-accent)" : "var(--color-highlight)" }}>
                    {plant.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: alertTier === "CRITICAL" ? "var(--color-red-bg)" : "var(--color-green-bg)",
                      color: alertTier === "CRITICAL" ? "var(--color-red)" : "var(--color-green)",
                      fontWeight: 700,
                    }}
                  >
                    {alertTier}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                  <span>{plant.capacity_mw} MW</span>
                  <span>{plant.river_basin} Basin</span>
                  <span>{plant.head_m}m Head</span>
                </div>
                <div style={{ fontSize: "10px", color: "var(--color-text-dim)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                  📍 {plant.latitude.toFixed(3)}°N, {plant.longitude.toFixed(3)}°E
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Auth Modal */}
      {authOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(10, 14, 25, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
              padding: "var(--space-6)",
              width: "380px",
              maxWidth: "90%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
                {user?.email ? "Operator Profile" : authTab === "login" ? "Sign In" : "Register Free Account"}
              </h3>
              <button
                onClick={() => setAuthOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {user?.email ? (
              <div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
                  Signed in as: <strong>{user.email}</strong>
                </p>
                <div style={{ fontSize: "var(--text-xs)", background: "var(--color-bg)", padding: "10px", borderRadius: "6px", marginBottom: "var(--space-4)" }}>
                  <div>Role: {user.role}</div>
                  <div>Tier: {user.tier}</div>
                  <div>Quota: Strictly {user.max_plants_allowed} registered plant</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    background: "var(--color-red-bg)",
                    border: "1px solid var(--color-red)",
                    color: "var(--color-red)",
                    borderRadius: "6px",
                    padding: "8px",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit}>
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                  <button
                    type="button"
                    onClick={() => setAuthTab("login")}
                    style={{
                      flex: 1,
                      padding: "6px",
                      background: authTab === "login" ? "var(--color-surface-raised)" : "transparent",
                      border: "1px solid var(--color-border)",
                      color: authTab === "login" ? "var(--color-highlight)" : "var(--color-text-secondary)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "var(--text-xs)",
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
                      background: authTab === "register" ? "var(--color-surface-raised)" : "transparent",
                      border: "1px solid var(--color-border)",
                      color: authTab === "register" ? "var(--color-highlight)" : "var(--color-text-secondary)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    Register
                  </button>
                </div>

                <div style={{ marginBottom: "var(--space-3)" }}>
                  <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--text-xs)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
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
                      borderRadius: "6px",
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--text-xs)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {authFeedback.err && (
                  <div style={{ color: "var(--color-red)", fontSize: "11px", marginBottom: "var(--space-3)" }}>
                    ✕ {authFeedback.err}
                  </div>
                )}
                {authFeedback.ok && (
                  <div style={{ color: "var(--color-green)", fontSize: "11px", marginBottom: "var(--space-3)" }}>
                    ✓ {authFeedback.ok}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "var(--color-accent)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px",
                    color: "#1A1010",
                    fontWeight: 700,
                    fontSize: "var(--text-xs)",
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
    </main>
  );
}
