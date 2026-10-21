"""Single source of truth for all HydroMesh data types.

All inter-module communication uses frozen Pydantic v2 models — no raw dicts
cross module boundaries. This file establishes the core schema contracts
slated for implementation in milestone T02.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field


class HydroMeshBaseModel(BaseModel):
    """Base frozen model for all HydroMesh schemas."""

    model_config = ConfigDict(frozen=True, extra="forbid")


# =============================================================================
# Milestone T02: Enumerations & Core Discriminators
# =============================================================================

class AlertTier(StrEnum):
    """Operational alert tiers tied to IEC 62364 wear regimes and sediment levels."""

    GREEN = "GREEN"      # < 1,200 PPM — Normal generation
    YELLOW = "YELLOW"    # 1,200 – 3,000 PPM — Sluice gate flush advisory
    RED = "RED"          # > 3,000 PPM — Critical alert; 10-min operator ACK window


class SafetyStatus(StrEnum):
    """Deterministic validation verdicts issued by SafetyValidator (R1–R11)."""

    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_HUMAN = "needs_human"


class ExecutionStatus(StrEnum):
    """Lifecycle states of an operational action dispatched to the plant twin."""

    PENDING_OVERRIDE = "pending_override"
    EXECUTED = "executed"
    OVERRIDDEN = "overridden"
    SKIPPED = "skipped"


# =============================================================================
# Milestone T02: Telemetry & Ingestion Contracts
# =============================================================================

class Telemetry(HydroMeshBaseModel):
    """Live sensor snapshot from digital twin or DHM SCADA proxy.

    TODO(T02): Add Pydantic validators enforcing physical bounds:
      - river_discharge_m3s >= 0.0
      - suspended_sediment_ppm >= 0.0
      - turbine_vibration_rms >= 0.0
      - grid_frequency_hz within [45.0, 55.0]
      - catchment_rainfall_mm_h >= 0.0
    """

    timestamp: str = Field(description="ISO 8601 UTC timestamp of reading")
    river_discharge_m3s: float = Field(description="Inflow discharge rate in m^3/s")
    suspended_sediment_ppm: float = Field(description="Quartz sediment concentration in PPM")
    turbine_vibration_rms: float = Field(description="Runner bearing vibration in mm/s RMS")
    grid_frequency_hz: float = Field(default=50.0, description="Grid synchronous frequency in Hz")
    catchment_rainfall_mm_h: float = Field(default=0.0, description="Upstream catchment rainfall rate")


# =============================================================================
# Milestone T02: Predictive & Triage Contracts
# =============================================================================

class Forecast(HydroMeshBaseModel):
    """Predicted peak discharge and suspended sediment over a 12–24h horizon.

    TODO(T02): Validate horizon_hours in [1, 24] and confidence in [0.0, 1.0].
    """

    horizon_hours: int = Field(default=12, description="Forecasting lookahead horizon in hours")
    peak_discharge_m3s: float = Field(description="Estimated maximum discharge in horizon")
    peak_sediment_ppm: float = Field(description="Estimated maximum sediment concentration")
    risk_window_start: str = Field(description="ISO 8601 start of elevated risk window")
    risk_window_end: str = Field(description="ISO 8601 end of elevated risk window")
    confidence: float = Field(ge=0.0, le=1.0, description="Model prediction confidence score")


class AnomalyVector(HydroMeshBaseModel):
    """Triage classifier output assessing multi-dimensional plant hazard risks.

    TODO(T02): Bind scikit-learn GradientBoosting triage output to normalized [0, 1] risk floats.
    """

    silt_risk: float = Field(ge=0.0, le=1.0, description="Probability of silt abrasion threshold breach")
    flood_risk: float = Field(ge=0.0, le=1.0, description="Probability of flood discharge overflow")
    cavitation_risk: float = Field(ge=0.0, le=1.0, description="Probability of turbine runner cavitation")
    severity: AlertTier = Field(description="Determined operational alert tier")
    primary_factor: str = Field(default="suspended_sediment_ppm", description="Root metric driving anomaly")


# =============================================================================
# Milestone T02: Memory & SOP RAG Contracts
# =============================================================================

class SOPMatch(HydroMeshBaseModel):
    """Standard Operating Procedure retrieved from on-prem ChromaDB knowledge base.

    TODO(T02): Validate similarity_score in [0.0, 1.0] and ensure prescribed_actions list is non-empty.
    """

    sop_id: str = Field(description="Unique identifier of standard operating procedure")
    title: str = Field(description="Descriptive title of procedure")
    similarity_score: float = Field(ge=0.0, le=1.0, description="Vector cosine similarity score")
    prescribed_actions: list[str] = Field(default_factory=list, description="Ordered procedural mitigation steps")


class SimilarIncident(HydroMeshBaseModel):
    """Historical plant incident record retrieved by semantic memory similarity.

    TODO(T02): Map historical blackboard snapshots to archived incident schemas.
    """

    incident_id: str = Field(description="Identifier of archived incident")
    timestamp: str = Field(description="Historical occurrence timestamp")
    similarity_score: float = Field(ge=0.0, le=1.0, description="Embedding similarity score")
    outcome: str = Field(description="Resolved plant outcome and operator response")


# =============================================================================
# Milestone T02: Action Discriminated Union
# =============================================================================

class ModulateIntake(HydroMeshBaseModel):
    """Advisory action: throttle or open plant headworks intake gates.

    TODO(T02): Enforce flow constraints against plant design flow (Rules R3, R4, R5).
    """

    action_type: Literal["ModulateIntake"] = "ModulateIntake"
    intake_id: str = Field(description="Identifier of target intake gate")
    target_flow_m3s: float = Field(description="Target flow rate in m^3/s")
    ramp_rate_m3s_per_min: float = Field(default=1.0, description="Maximum permitted ramp rate")


class TriggerFlush(HydroMeshBaseModel):
    """Advisory action: open desander basin bottom sluice gates to purge quartz silt.

    TODO(T02): Validate flush duration within [5, 90] minutes (Rule R6) and cooldown (Rule R7).
    """

    action_type: Literal["TriggerFlush"] = "TriggerFlush"
    basin_id: str = Field(description="Identifier of desander basin")
    duration_minutes: int = Field(ge=5, le=90, description="Flush cycle duration in minutes")


class ReallocateDispatch(HydroMeshBaseModel):
    """Advisory action: rebalance unit turbine load or curtail power generation.

    TODO(T02): Verify target_mw does not exceed available capacity (Rule R9).
    """

    action_type: Literal["ReallocateDispatch"] = "ReallocateDispatch"
    active_units: list[str] = Field(description="Ordered list of online turbine units")
    target_mw: float = Field(description="Total target generation output in MW")


# Discriminated union of all operational action types
Action = Annotated[
    Union[ModulateIntake, TriggerFlush, ReallocateDispatch],
    Field(discriminator="action_type"),
]


# =============================================================================
# Milestone T02: Dispatch & Safety Verdict Contracts
# =============================================================================

class AgentDecision(HydroMeshBaseModel):
    """Operational proposal generated by Dispatch agent before safety arbitration.

    TODO(T02): Enforce confidence threshold >= 0.80 per Safety Rule R1.
    """

    decision_id: str = Field(description="Unique decision transaction ID")
    actions: list[Action] = Field(default_factory=list, description="Ordered candidate actions")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in recommendation")
    rationale: str = Field(description="Chain-of-thought justification for proposed actions")


class SafetyVerdict(HydroMeshBaseModel):
    """Deterministic verdict produced by pure, non-LLM SafetyValidator (Rules R1–R11).

    TODO(T02): Implement R1–R11 evaluation logic and action parameter clamping.
    """

    verdict: SafetyStatus = Field(description="Safety outcome: approved, rejected, or needs_human")
    evaluated_rules: list[str] = Field(default_factory=list, description="List of rule IDs verified")
    clamped_actions: list[Action] = Field(default_factory=list, description="Actions post parameter clamping")
    violations: list[str] = Field(default_factory=list, description="Rule violation explanations if rejected")
    notes: str = Field(default="", description="Informational arbitration notes")


class ExecutionResult(HydroMeshBaseModel):
    """State transition tracking action enactment or operator override.

    TODO(T02): Implement countdown timer and auto-transition after 10-minute timeout.
    """

    action_id: str = Field(description="Referenced action identifier")
    status: ExecutionStatus = Field(description="Current execution lifecycle status")
    operator_id: str | None = Field(default=None, description="ID of acknowledging operator, if any")
    timestamp: str = Field(description="ISO 8601 state change timestamp")


# =============================================================================
# Milestone T02: Live Streaming, Twin & Aggregate Contracts
# =============================================================================

class RoutingPlan(HydroMeshBaseModel):
    """Supervisor agent pipeline execution graph.

    TODO(T02): Add dynamic dependency step sequencing and skip condition logic.
    """

    plan_id: str = Field(description="Unique routing execution ID")
    active_steps: list[str] = Field(description="Pipeline agent steps scheduled to run")
    initiated_at: str = Field(description="Execution start timestamp")


class AgentEvent(HydroMeshBaseModel):
    """Atomic telemetry / agent event streamed via WebSocket `/ws/stream` and Redis.

    TODO(T02): Integrate Redis Stream consumer group serialization.
    """

    event_id: str = Field(description="Monotonic event ID")
    timestamp: str = Field(description="ISO 8601 timestamp")
    source_agent: str = Field(description="Agent emitting event (e.g. triage, dispatch)")
    kind: Literal["info", "decision", "warning", "action"] = Field(description="UI indicator kind")
    payload: dict[str, Any] = Field(default_factory=dict, description="Arbitrary structured event payload")


class TwinSnapshot(HydroMeshBaseModel):
    """Complete plant state snapshot used for safety rule evaluation context.

    TODO(T02): Synchronize with Digital Twin tick generator.
    """

    tick: int = Field(description="Monotonic simulation step tick")
    timestamp: str = Field(description="Current simulation timestamp")
    intake_flow_m3s: float = Field(description="Current intake volumetric flow")
    desander_basins: dict[str, dict[str, Any]] = Field(description="Per-basin silt and status state")
    runner_wear_mm: float = Field(description="Accumulated IEC 62364 runner erosion in mm")
    current_generation_mw: float = Field(description="Active power generation in MW")
    available_generation_mw: float = Field(description="Total nameplate/available capacity in MW")
    recent_action_count_10m: int = Field(default=0, description="Count of actions executed in last 10m")


class IncidentReport(HydroMeshBaseModel):
    """Operator-facing incident briefing generated by Explain agent or fallback template.

    TODO(T02): Integrate LLM synthesis with fail-safe deterministic Jinja2 fallback template.
    """

    incident_id: str = Field(description="Unique incident ID")
    timestamp: str = Field(description="ISO 8601 incident trigger timestamp")
    alert_tier: AlertTier = Field(description="Highest alert tier reached during incident")
    status: str = Field(description="Operational incident status")
    summary: str = Field(description="Concise operator summary of hazard and mitigation")
    requires_override: bool = Field(default=False, description="Whether action awaits manual override")
    ack_window_seconds: int = Field(default=600, description="Operator ACK countdown window")


class Incident(BaseModel):
    """Mutable blackboard aggregate assembled across all agent pipeline stages.

    TODO(T02): Wire Redis Blackboard get_incident/set_incident state transitions.
    """

    incident_id: str
    telemetry: Telemetry | None = None
    forecast: Forecast | None = None
    anomaly: AnomalyVector | None = None
    sop_matches: list[SOPMatch] = Field(default_factory=list)
    decision: AgentDecision | None = None
    verdict: SafetyVerdict | None = None
    report: IncidentReport | None = None
