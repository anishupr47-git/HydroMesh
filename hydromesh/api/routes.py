"""HydroMesh API Endpoints, WebSocket Streams, and Live Digital Twin UI."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse

from hydromesh.llm import OllamaClient, OllamaConfig
from hydromesh.safety import SafetyContext, validate
from hydromesh.schemas import (
    AgentDecision,
    ModulateIntake,
    Telemetry,
    TriggerFlush,
    TwinSnapshot,
)
from hydromesh.twin import scenarios
from hydromesh.twin.plant import PlantSpec, PlantTwin

router = APIRouter()

# Shared persistent plant twin instance for live interactions
_shared_spec = PlantSpec()
_shared_twin = PlantTwin(scenarios.monsoon_surge, spec=_shared_spec, seed=42)
_history: list[dict[str, Any]] = []


def _format_prompt(telemetry: Telemetry, snapshot: TwinSnapshot) -> str:
    gates_info = ", ".join(
        f"Gate {gid}: flow {g.flow_m3s:.1f} m3/s (max {g.design_flow_m3s:.1f})" for gid, g in snapshot.gates.items()
    )
    basins_info = ", ".join(
        f"Basin {bid}: sediment {b.sediment_level * 100:.1f}%, flushing={b.flushing}"
        for bid, b in snapshot.basins.items()
    )
    return (
        f"Current Hydropower Plant State:\n"
        f"- River Discharge: {telemetry.discharge_m3s:.1f} m3/s\n"
        f"- Silt Concentration: {telemetry.silt_ppm:.1f} ppm\n"
        f"- Vibration: {telemetry.vibration_mm_s:.2f} mm/s\n"
        f"- Available Power: {snapshot.available_mw:.1f} MW\n"
        f"- Intake Gates: {gates_info}\n"
        f"- Desander Basins: {basins_info}\n\n"
        f"Physical limits:\n"
        f"- Valid modulate_penstock_intake: gate_id in (0, 1), flow_target_m3s between 15.0 and 30.0\n"
        f"- Valid trigger_sand_flushing_cycle: basin_id in (0, 1), duration_mins between 5 and 90\n"
        f"- Strict Action Limit: Propose at most 2 actions in total (Safety Rule R8 allows at most 3 actions per 10 min window)\n\n"
        f"Propose optimal actions to safeguard turbines against sediment abrasion while maintaining generation."
    )


@router.get("/api/v1/twin/state")
def get_twin_state() -> dict[str, Any]:
    """Retrieve current digital twin snapshot and latest telemetry."""
    snap = _shared_twin.snapshot()
    telem = _shared_twin.step(0.0)
    return {
        "telemetry": telem.model_dump(mode="json"),
        "snapshot": snap.model_dump(mode="json"),
        "sim_time_s": _shared_twin._t,
    }


@router.get("/api/v1/orchestrate/run")
async def run_orchestration_cycle(
    scenario_type: str = Query(default="monsoon_surge", description="monsoon_surge | inflow_surge | normal"),
    model_name: str = Query(default="qwen2.5:0.5b", description="Ollama model to use"),
    sim_step_s: float = Query(default=60.0, ge=1.0, le=600.0),
) -> dict[str, Any]:
    """Execute end-to-end AI Orchestration:
    1. Tick Plant Twin
    2. Read Telemetry
    3. Query Local Ollama LLM (Qwen 2.5) for AgentDecision
    4. Validate against Safety Kernel (Rules R1-R11)
    5. Atomically apply approved actions to Plant Twin
    6. Return full auditable execution trace
    """
    global _shared_twin
    # Advance twin
    telemetry_before = _shared_twin.step(sim_step_s)
    snapshot_before = _shared_twin.snapshot()

    prompt = _format_prompt(telemetry_before, snapshot_before)

    # 1. Query Ollama LLM
    cfg = OllamaConfig(model=model_name, timeout_s=30.0)
    llm = OllamaClient(cfg)
    try:
        decision = await llm.generate_structured(
            system=(
                "You are HydroMesh Orchestrator, an industrial hydropower controller AI. "
                "Output valid JSON AgentDecision. confidence must be between 0.0 and 1.0."
            ),
            user=prompt,
            schema=AgentDecision,
        )
        llm_error = None
    except Exception as exc:
        llm_error = f"{type(exc).__name__}: {exc}"
        # Deterministic safe fallback decision
        decision = AgentDecision(
            actions=(
                ModulateIntake(gate_id=0, flow_target_m3s=20.0),
                TriggerFlush(basin_id=0, duration_mins=15),
            ),
            rationale=f"Fallback triggered due to LLM exception ({llm_error}). Conservative sediment mitigation.",
            confidence=0.85,
        )

    # 2. Validate with Safety Kernel
    ctx = SafetyContext(
        twin=snapshot_before,
        recent_action_ts=tuple(t["ts_s"] for t in _history[-5:] if "ts_s" in t),
        now_s=_shared_twin._t,
        deterministic_confidence=1.0,
    )
    verdict = validate(decision, ctx)

    # 3. Apply approved actions atomically to the Digital Twin
    applied = False
    if verdict.status == "approved" and verdict.approved_actions:
        applied = _shared_twin.apply(decision)

    snapshot_after = _shared_twin.snapshot()

    record = {
        "timestamp": datetime.now(UTC).isoformat(),
        "ts_s": _shared_twin._t,
        "scenario": scenario_type,
        "model": model_name,
        "telemetry_before": telemetry_before.model_dump(mode="json"),
        "llm_prompt": prompt,
        "llm_decision": decision.model_dump(mode="json"),
        "llm_error": llm_error,
        "safety_verdict": verdict.model_dump(mode="json"),
        "applied": applied,
        "snapshot_after": snapshot_after.model_dump(mode="json"),
    }
    _history.append(record)
    return record


@router.get("/", response_class=HTMLResponse)
def dashboard() -> HTMLResponse:
    """Live Interactive HydroMesh Control Dashboard."""
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HydroMesh • Autonomous Plant Operations & Digital Twin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #0b0f19; color: #e2e8f0; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen p-6 antialiased">
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 class="text-2xl font-bold text-white tracking-tight">HydroMesh Autonomous Twin</h1>
          <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-950 text-blue-400 border border-blue-800">Local Qwen 2.5 • Zero Cost</span>
        </div>
        <p class="text-sm text-slate-400 mt-1">Closed-loop Orchestration: Ollama LLM &rarr; Safety Guard R1-R11 &rarr; Plant Physics Simulator</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/docs" target="_blank" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">Swagger API Docs</a>
        <a href="/api/v1/orchestrate/run" target="_blank" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">Raw JSON</a>
      </div>
    </header>

    <!-- Trigger Action Bar -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
      <div class="flex items-center gap-4">
        <div>
          <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Active Weather Scenario</span>
          <span class="text-emerald-400 font-medium">Monsoon Surge (Heavy River Silt)</span>
        </div>
        <div class="h-8 w-px bg-slate-800"></div>
        <div>
          <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Ollama LLM Model</span>
          <span class="text-purple-400 font-mono text-sm font-semibold">qwen2.5:0.5b (GPU Resident)</span>
        </div>
      </div>
      <button id="runBtn" onclick="runCycle()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold rounded-lg shadow-lg shadow-emerald-900/40 transition flex items-center gap-2">
        <svg id="spinner" class="hidden animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <span id="btnText">Trigger AI Orchestration Cycle</span>
      </button>
    </div>

    <!-- Live Telemetry Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400 block mb-1">River Discharge</span>
        <div class="text-2xl font-bold text-white font-mono" id="valDischarge">-- m³/s</div>
        <span class="text-[11px] text-slate-500">Design Capacity: 60.0 m³/s</span>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400 block mb-1">Sediment Load</span>
        <div class="text-2xl font-bold text-amber-400 font-mono" id="valSilt">-- ppm</div>
        <span class="text-[11px] text-amber-500/80">Abrasion threshold: 1,500 ppm</span>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400 block mb-1">Generated Power</span>
        <div class="text-2xl font-bold text-sky-400 font-mono" id="valPower">-- MW</div>
        <span class="text-[11px] text-slate-500">2x 30m³/s Turbines</span>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400 block mb-1">Turbine Vibration</span>
        <div class="text-2xl font-bold text-rose-400 font-mono" id="valVib">-- mm/s</div>
        <span class="text-[11px] text-rose-500/80">Safety limit: 4.5 mm/s</span>
      </div>
    </div>

    <!-- Detailed 3-Step Execution View -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 1. LLM Reasoning -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <span class="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span> 1. Qwen 2.5 Proposal
          </span>
          <span id="badgeConf" class="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-purple-300">--% conf</span>
        </div>
        <p id="txtRationale" class="text-xs text-slate-300 leading-relaxed min-h-[90px] italic">
          Click the trigger button to ask local Qwen 2.5 to analyze the current sediment surge and propose control actions.
        </p>
        <div class="pt-2">
          <span class="text-[11px] text-slate-500 block mb-1 uppercase font-semibold">Proposed Actions:</span>
          <div id="boxActions" class="text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 overflow-x-auto min-h-[60px]">
            None proposed yet.
          </div>
        </div>
      </div>

      <!-- 2. Safety Kernel Verdict -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> 2. Safety Guard (R1-R11)
          </span>
          <span id="badgeVerdict" class="text-xs px-2 py-0.5 rounded font-bold font-mono bg-slate-800 text-slate-400">WAITING</span>
        </div>
        <div class="text-xs text-slate-400 space-y-1">
          <p class="font-semibold text-slate-300">Deterministic Rule Gates:</p>
          <ul class="text-[11px] list-disc list-inside space-y-0.5 text-slate-400">
            <li>R1: Confidence &ge; 80%</li>
            <li>R3/R4: Never cut flow &gt; 50% / Min 20%</li>
            <li>R5: Never exceed gate design capacity</li>
            <li>R6/R7: Flush 5-90 min with 1hr cooldown</li>
          </ul>
        </div>
        <div class="pt-2">
          <span class="text-[11px] text-slate-500 block mb-1 uppercase font-semibold">Guard Reasons & Approved:</span>
          <div id="boxVerdict" class="text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-400 overflow-x-auto min-h-[60px]">
            No evaluation yet.
          </div>
        </div>
      </div>

      <!-- 3. Physical Twin State -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <span class="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-sky-400"></span> 3. Actuator & Twin Execution
          </span>
          <span id="badgeExecuted" class="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400">IDLE</span>
        </div>
        <p class="text-xs text-slate-400">
          Atomic validation against fresh physical telemetry ensures safety invariance before actuators move.
        </p>
        <div class="pt-2 space-y-2">
          <div class="bg-slate-950 p-2 rounded border border-slate-800">
            <div class="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Basin 0 Sediment</span>
              <span id="b0Level">0%</span>
            </div>
            <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div id="b0Bar" class="bg-amber-500 h-full w-0 transition-all duration-500"></div>
            </div>
          </div>
          <div class="bg-slate-950 p-2 rounded border border-slate-800">
            <div class="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Basin 1 Sediment</span>
              <span id="b1Level">0%</span>
            </div>
            <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div id="b1Bar" class="bg-amber-500 h-full w-0 transition-all duration-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Log Stream -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Audit Trail (Last Cycle Payload)</span>
        <span class="text-[11px] text-slate-500">Deterministic & Auditable</span>
      </div>
      <pre id="jsonTrace" class="text-xs bg-slate-950 p-4 rounded-lg border border-slate-800 text-emerald-300 overflow-x-auto max-h-64 font-mono">// Ready. Click 'Trigger AI Orchestration Cycle' above.</pre>
    </div>
  </div>

  <script>
    async function loadCurrent() {
      try {
        const res = await fetch('/api/v1/twin/state');
        const data = await res.json();
        updateUI(data.telemetry, data.snapshot);
      } catch (err) {
        console.error(err);
      }
    }

    function updateUI(t, s) {
      if (t) {
        document.getElementById('valDischarge').innerText = t.discharge_m3s.toFixed(1) + ' m³/s';
        document.getElementById('valSilt').innerText = Math.round(t.silt_ppm).toLocaleString() + ' ppm';
        document.getElementById('valVib').innerText = t.vibration_mm_s.toFixed(2) + ' mm/s';
      }
      if (s) {
        document.getElementById('valPower').innerText = s.available_mw.toFixed(1) + ' MW';
        if (s.basins && s.basins[0]) {
          const p0 = Math.min(100, Math.round(s.basins[0].sediment_level * 100));
          document.getElementById('b0Level').innerText = p0 + '%';
          document.getElementById('b0Bar').style.width = p0 + '%';
        }
        if (s.basins && s.basins[1]) {
          const p1 = Math.min(100, Math.round(s.basins[1].sediment_level * 100));
          document.getElementById('b1Level').innerText = p1 + '%';
          document.getElementById('b1Bar').style.width = p1 + '%';
        }
      }
    }

    async function runCycle() {
      const btn = document.getElementById('runBtn');
      const spinner = document.getElementById('spinner');
      const btnText = document.getElementById('btnText');
      btn.disabled = true;
      spinner.classList.remove('hidden');
      btnText.innerText = 'Consulting Qwen 2.5 in Ollama...';

      try {
        const res = await fetch('/api/v1/orchestrate/run');
        const data = await res.json();

        // 1. Telemetry
        updateUI(data.telemetry_before, data.snapshot_after);

        // 2. LLM Decision
        const dec = data.llm_decision;
        document.getElementById('badgeConf').innerText = Math.round(dec.confidence * 100) + '% conf';
        document.getElementById('txtRationale').innerText = dec.rationale;
        document.getElementById('boxActions').innerHTML = dec.actions.length > 0 
          ? dec.actions.map(a => `<div class="mb-1 text-purple-300">&bull; <span class="font-bold">${a.tool}</span>: ${JSON.stringify(a)}</div>`).join('')
          : '<span class="text-slate-500">No actions proposed</span>';

        // 3. Safety Verdict
        const verd = data.safety_verdict;
        const vBadge = document.getElementById('badgeVerdict');
        vBadge.innerText = verd.status.toUpperCase();
        if (verd.status === 'approved') {
          vBadge.className = 'text-xs px-2 py-0.5 rounded font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800';
        } else if (verd.status === 'rejected') {
          vBadge.className = 'text-xs px-2 py-0.5 rounded font-bold font-mono bg-rose-950 text-rose-400 border border-rose-800';
        } else {
          vBadge.className = 'text-xs px-2 py-0.5 rounded font-bold font-mono bg-amber-950 text-amber-400 border border-amber-800';
        }
        
        let reasonsHtml = (verd.reasons || []).map(r => `<div class="text-amber-300">&bull; ${r}</div>`).join('');
        if (verd.approved_actions && verd.approved_actions.length > 0) {
          reasonsHtml += '<div class="text-emerald-400 font-semibold mt-1">Approved Actions: ' + verd.approved_actions.length + '</div>';
        }
        document.getElementById('boxVerdict').innerHTML = reasonsHtml || '<span class="text-emerald-400">All rules verified clean.</span>';

        // 4. Actuator badge
        const aBadge = document.getElementById('badgeExecuted');
        if (data.applied) {
          aBadge.innerText = 'EXECUTED ON TWIN';
          aBadge.className = 'text-xs px-2 py-0.5 rounded font-mono bg-sky-950 text-sky-400 border border-sky-800 font-bold';
        } else {
          aBadge.innerText = 'BLOCKED / NO-OP';
          aBadge.className = 'text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400';
        }

        // 5. JSON audit
        document.getElementById('jsonTrace').innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        alert('Failed to run cycle: ' + err);
      } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        btnText.innerText = 'Trigger AI Orchestration Cycle';
      }
    }

    loadCurrent();
  </script>
</body>
</html>
"""
    )
