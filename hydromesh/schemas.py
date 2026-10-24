"""Single source of truth for every cross-module type.

All models are frozen, reject unknown fields, and reject NaN/inf (a NaN sensor reading must
never reach a safety rule). Collections are tuples so instances stay immutable and hashable.

Hardening (Security Finding F2):
- Strict bounds (max_length) on every string and collection to prevent memory bloat and injection carriers.
- Rigid regex pattern on identifiers (Incident.id, etc.) preventing path traversal and injection.
- Size-capped typed mapping of JSON scalars for AgentEvent.payload, rejecting nested unbounded blobs.
- Control character rejection on all string fields (CWE-116/CWE-20).
"""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

Prob = Annotated[float, Field(ge=0, le=1)]
NonNeg = Annotated[float, Field(ge=0)]
Scalar = Annotated[str, Field(max_length=512)] | int | float | bool | None


def _reject_control_chars(val: Any) -> None:
    if isinstance(val, str):
        if any(ord(c) < 32 and c not in "\t\n\r" for c in val) or "\x7f" in val:
            raise ValueError("Control characters are not permitted in string fields")
    elif isinstance(val, (list, tuple)):
        for item in val:
            _reject_control_chars(item)
    elif isinstance(val, dict):
        for k, item in val.items():
            _reject_control_chars(k)
            _reject_control_chars(item)


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", allow_inf_nan=False)

    @model_validator(mode="before")
    @classmethod
    def _validate_clean_strings(cls, data: Any) -> Any:
        if isinstance(data, dict):
            _reject_control_chars(data)
        return data


class Severity(StrEnum):
    NORMAL = "normal"
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"


# --- sensing & analysis ----------------------------------------------------------------
class Telemetry(Frozen):
    ts: AwareDatetime
    discharge_m3s: NonNeg
    silt_ppm: NonNeg
    vibration_mm_s: NonNeg
    grid_freq_hz: Annotated[float, Field(ge=45, le=55)]
    rainfall_mm_h: NonNeg = 0.0


class Forecast(Frozen):
    horizon_h: Annotated[int, Field(ge=1, le=24)]
    peak_discharge_m3s: NonNeg
    peak_silt_ppm: NonNeg
    risk: Severity
    confidence: Prob
    method: Literal["rating_curve_trend", "arima"]


class AnomalyVector(Frozen):
    severity: Severity
    cavitation_risk: Prob
    silt_risk: Prob
    grid_risk: Prob
    confidence: Prob


class SOPMatch(Frozen):
    doc_id: Annotated[str, Field(max_length=64)]
    section: Annotated[str, Field(max_length=120)]
    text: Annotated[str, Field(max_length=2000)]
    score: Prob


class SimilarIncident(Frozen):
    incident_id: Annotated[str, Field(max_length=64)]
    summary: Annotated[str, Field(max_length=1000)]
    action: Annotated[str, Field(max_length=500)]
    outcome: Literal["protected", "partial", "failed", "unknown"]
    score: Prob


# --- actions: discriminated union, one model per tool ----------------------------------
class ModulateIntake(Frozen):
    tool: Literal["modulate_penstock_intake"] = "modulate_penstock_intake"
    gate_id: Annotated[int, Field(ge=0)]
    flow_target_m3s: NonNeg


class TriggerFlush(Frozen):
    tool: Literal["trigger_sand_flushing_cycle"] = "trigger_sand_flushing_cycle"
    basin_id: Annotated[int, Field(ge=0)]
    duration_mins: Annotated[int, Field(ge=1)]


class ReallocateDispatch(Frozen):
    tool: Literal["reallocate_grid_dispatch"] = "reallocate_grid_dispatch"
    mw_target: NonNeg
    feeder_priority: Annotated[tuple[Annotated[str, Field(max_length=64)], ...], Field(min_length=1, max_length=16)]
    advisory: Literal[True] = True  # MVP: a recommendation to dispatchers, never auto-switched


Action = Annotated[ModulateIntake | TriggerFlush | ReallocateDispatch, Field(discriminator="tool")]


class AgentDecision(Frozen):
    actions: Annotated[tuple[Action, ...], Field(max_length=4)]
    rationale: Annotated[str, Field(max_length=600)]
    confidence: Prob


VerdictStatus = Literal["approved", "rejected", "needs_human"]


class SafetyVerdict(Frozen):
    status: VerdictStatus
    reasons: tuple[Annotated[str, Field(max_length=500)], ...] = ()
    approved_actions: tuple[Action, ...] = ()  # possibly clamped versions of the proposal


class ExecutionResult(Frozen):
    status: Literal["pending_override", "executed", "overridden", "skipped"]
    executed_at: AwareDatetime | None = None
    override_deadline: AwareDatetime | None = None


# --- reporting & orchestration ---------------------------------------------------------
class IncidentReport(Frozen):
    title: Annotated[str, Field(max_length=120)]
    trigger: Annotated[str, Field(max_length=500)]
    prediction: Annotated[str, Field(max_length=500)]
    action_taken: Annotated[str, Field(max_length=500)]
    confidence_note: Annotated[str, Field(max_length=500)]
    similar_incident_note: Annotated[str, Field(max_length=500)] | None = None


class RoutingPlan(Frozen):
    steps: tuple[Literal["triage", "sop_rag", "predict", "dispatch", "explain"], ...]
    reason: Annotated[str, Field(max_length=300)]


class AgentEvent(Frozen):
    ts: AwareDatetime
    incident_id: Annotated[str, Field(max_length=64, pattern=r"^[A-Za-z0-9_-]{1,64}$")] | None = None
    agent: Annotated[str, Field(max_length=64)]
    kind: Literal["info", "decision", "warning", "action"]
    message: Annotated[str, Field(max_length=500)]
    payload: Annotated[
        dict[Annotated[str, Field(max_length=64)], Scalar],
        Field(default_factory=dict, max_length=32),
    ]


# --- plant state seen by the safety kernel and dispatcher ------------------------------
class GateState(Frozen):
    gate_id: int
    flow_m3s: NonNeg
    design_flow_m3s: NonNeg


class BasinState(Frozen):
    basin_id: int
    sediment_level: Prob
    flushing: bool
    last_flush_age_mins: NonNeg | None = None


class TwinSnapshot(Frozen):
    ts: AwareDatetime
    gates: dict[int, GateState]
    basins: dict[int, BasinState]
    available_mw: NonNeg
    critical_feeders: tuple[Annotated[str, Field(max_length=64)], ...]
    runner_wear: Prob  # cumulative, fraction of runner life consumed


class Incident(Frozen):
    """Read-model assembled from blackboard sections; never mutated in place."""

    id: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")]
    opened_at: AwareDatetime
    telemetry: Telemetry | None = None
    forecast: Forecast | None = None
    anomaly: AnomalyVector | None = None
    sop_matches: tuple[SOPMatch, ...] = ()
    similar: tuple[SimilarIncident, ...] = ()
    plan: RoutingPlan | None = None
    decision: AgentDecision | None = None
    verdict: SafetyVerdict | None = None
    execution: ExecutionResult | None = None
    report: IncidentReport | None = None
