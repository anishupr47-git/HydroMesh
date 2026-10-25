"""Multi-Agent Orchestration Pipeline.

Overview:
    Coordinates the end-to-end execution of specialized intelligence agents and enforces
    deterministic safety verification on all proposed plant actions.

Operational Workflow:
    1. Telemetry Ingestion & Triage: Ingests river flow, silt PPM, and weather observations,
       classifying initial hazard level.
    2. Dynamic Supervisory Planning: Determines necessary evaluation depth based on environmental severity.
    3. Predictive Hydrology & Forecasting: Models 24-hour upstream precipitation runoff and sediment wave arrival.
    4. SOP & Historical Retrieval: Queries cryptographically verified standard operating manuals for matching protocols.
    5. Action Synthesis: Proposes advisory intake gate modulation and sediment flushing schedules.
    6. Deterministic Safety Verification: Validates all proposed actions against Rules R1–R11 (hydraulic,
       mechanical, and ecological limits).
    7. Incident Briefing: Generates clear, plain-language operational summaries for human control room engineers.
    8. Immutable State Ledger: Records all observations, agent decisions, and safety verdicts to the blackboard audit trail.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime
from uuid import uuid4

from hydromesh.agents.dispatch import DispatchAgent
from hydromesh.agents.explain import ExplainAgent
from hydromesh.agents.predictive import PredictiveAgent
from hydromesh.agents.sop_rag import SOPRAGAgent
from hydromesh.agents.supervisor import SupervisorAgent
from hydromesh.agents.triage import TriageAgent
from hydromesh.blackboard import Blackboard
from hydromesh.llm import OllamaClient
from hydromesh.logging import get_logger
from hydromesh.memory import SOPMemory
from hydromesh.safety import SafetyContext, validate
from hydromesh.schemas import (
    BasinState,
    ExecutionResult,
    Forecast,
    GateState,
    HydroPlantSpec,
    Incident,
    Telemetry,
    TwinSnapshot,
    WeatherObservation,
)

log = get_logger(__name__)


class OrchestrationPipeline:
    """End-to-end multi-agent pipeline coordinator with fail-closed safety gating."""

    def __init__(
        self,
        plant: HydroPlantSpec | None = None,
        *,
        blackboard: Blackboard | None = None,
        llm_client: OllamaClient | None = None,
        memory: SOPMemory | None = None,
    ) -> None:
        self.plant = plant
        self.blackboard = blackboard or Blackboard()
        self.memory = memory or SOPMemory()
        self.llm_client = llm_client

        # Initialize the 5 specialized agent brains + supervisor
        self.triage = TriageAgent()
        self.predictive = PredictiveAgent(plant=self.plant)
        self.sop_rag = SOPRAGAgent(memory=self.memory)
        self.dispatch = DispatchAgent(llm_client=self.llm_client)
        self.explain = ExplainAgent()
        self.supervisor = SupervisorAgent()

    def _default_snapshot(self) -> TwinSnapshot:
        design = self.plant.design_flow_m3s if self.plant else 30.0
        return TwinSnapshot(
            ts=datetime.now(UTC),
            gates={0: GateState(gate_id=0, flow_m3s=min(30.0, design), design_flow_m3s=design)},
            basins={0: BasinState(basin_id=0, sediment_level=0.4, flushing=False)},
            available_mw=self.plant.capacity_mw if self.plant else 60.0,
            critical_feeders=("hospital", "water_pump", "ward_clinic"),
            runner_wear=0.04,
        )

    async def run_cycle(
        self,
        telemetry: Telemetry,
        weather: WeatherObservation,
        snapshot: TwinSnapshot | None = None,
        *,
        now_s: float | None = None,
    ) -> Incident:
        """Execute end-to-end multi-agent orchestration cycle."""
        plant_id = self.plant.id if self.plant else "upper_tamakoshi"
        sim_now_s = now_s if now_s is not None else time.monotonic()
        twin_snap = snapshot or self._default_snapshot()

        # Update telemetry in blackboard
        await self.blackboard.update_telemetry(plant_id, telemetry)
        history = await self.blackboard.get_telemetry_history(plant_id, limit=20)

        # 1. Triage Agent (The Lookout)
        anomaly = await self.triage.run(telemetry, history=history)
        await self.blackboard.set_alert_tier(plant_id, anomaly.severity)

        # 2. Supervisor Agent (Dynamic Routing Plan)
        plan = await self.supervisor.run(telemetry, anomaly)

        # 3. Predictive Agent (The Forecaster)
        if "predict" in plan.steps:
            forecast = await self.predictive.run(telemetry, weather, horizon_h=24)
        else:
            forecast = Forecast(
                horizon_h=24,
                peak_discharge_m3s=telemetry.discharge_m3s,
                peak_silt_ppm=telemetry.silt_ppm,
                risk=anomaly.severity,
                confidence=0.90,
                method="rating_curve_trend",
            )

        # 4. SOP RAG Agent (The Librarian)
        if "sop_rag" in plan.steps:
            sop_matches, similar = await self.sop_rag.run(telemetry, anomaly)
        else:
            sop_matches, similar = (), ()

        # 5. Dispatch Agent (The Strategist)
        decision = await self.dispatch.run(
            telemetry=telemetry,
            anomaly=anomaly,
            forecast=forecast,
            sop_matches=sop_matches,
            similar=similar,
            snapshot=twin_snap,
        )

        # 6. Safety Kernel Verification (Rules R1-R11)
        recent_actions = await self.blackboard.get_audit_trail(plant_id=plant_id, limit=10)
        recent_ts = tuple(float(i) for i in range(len(recent_actions)))  # monotonic sequence
        ctx = SafetyContext(
            twin=twin_snap,
            recent_action_ts=recent_ts,
            now_s=sim_now_s,
            deterministic_confidence=anomaly.confidence,
        )
        verdict = validate(decision, ctx)

        # 7. Execution tracking
        now_dt = datetime.now(UTC)
        if verdict.status == "approved" and verdict.approved_actions:
            execution = ExecutionResult(status="executed", executed_at=now_dt)
        else:
            execution = ExecutionResult(status="skipped")

        # 8. Explain Agent (The Reporter)
        if "explain" in plan.steps:
            report = await self.explain.run(
                telemetry=telemetry,
                anomaly=anomaly,
                forecast=forecast,
                decision=decision,
                verdict=verdict,
                similar=similar,
            )
        else:
            report = None

        # 9. Assemble frozen Incident record
        incident_id = f"INC-{plant_id[:8].upper()}-{uuid4().hex[:6]}"
        incident = Incident(
            id=incident_id,
            opened_at=now_dt,
            telemetry=telemetry,
            forecast=forecast,
            anomaly=anomaly,
            sop_matches=sop_matches,
            similar=similar,
            plan=plan,
            decision=decision,
            verdict=verdict,
            execution=execution,
            report=report,
        )

        # 10. Record to Blackboard & Audit Trail
        await self.blackboard.record_incident(incident)
        await self.blackboard.record_audit_event(
            event_type="pipeline_cycle_completed",
            plant_id=plant_id,
            payload={
                "incident_id": incident.id,
                "severity": anomaly.severity.value,
                "safety_verdict": verdict.status,
                "actions_count": len(verdict.approved_actions),
            },
        )

        return incident
