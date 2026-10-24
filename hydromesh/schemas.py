"""Plant Data Contracts & Official Forms (Pydantic Schemas).

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Official Form Book for the entire hydropower station!
Every sensor reading, water gate order, emergency alert, and report has an exact, clean form.
1. No Broken Numbers: Rejects broken sensor glitches (like NaN or infinity) before they reach safety rules.
2. Frozen Paperwork: Once a form is filled out, it is locked (frozen). Nobody can tamper with it.
3. Clean Letters (Security F2): Every word has a length cap and blocks hidden computer control codes.

Hardening (Security Finding F2):
- Strict bounds (max_length) on every string and collection to prevent memory bloat and injection carriers.
- Rigid regex pattern on identifiers (Incident.id, etc.) preventing path traversal and injection.
- Size-capped typed mapping of JSON scalars for AgentEvent.payload, rejecting nested unbounded blobs.
- Control character rejection on all string fields (CWE-116/CWE-20).
"""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

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

    @field_validator("confidence", mode="before")
    @classmethod
    def _normalize_confidence(cls, v: Any) -> Any:
        if isinstance(v, (int, float)) and 1.0 < v <= 100.0:
            return v / 100.0
        return v

    @field_validator("actions", mode="before")
    @classmethod
    def _infer_action_tool(cls, actions: Any) -> Any:
        if not isinstance(actions, (list, tuple)):
            return actions
        fixed = []
        for a in actions:
            if isinstance(a, dict) and "tool" not in a:
                if "gate_id" in a or "flow_target_m3s" in a:
                    a = {**a, "tool": "modulate_penstock_intake"}
                elif "basin_id" in a or "duration_mins" in a:
                    a = {**a, "tool": "trigger_sand_flushing_cycle"}
                elif "feeder_priority" in a or "mw_target" in a:
                    a = {**a, "tool": "reallocate_grid_dispatch"}
            fixed.append(a)
        return fixed


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


# --- nepal hydro registry & weather ----------------------------------------------------
class HydroPlantSpec(Frozen):
    id: Annotated[str, Field(pattern=r"^[a-z0-9_]{1,64}$")]
    name: Annotated[str, Field(max_length=120)]
    capacity_mw: NonNeg
    river_basin: Annotated[str, Field(max_length=64)]
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]
    design_flow_m3s: NonNeg
    head_m: NonNeg
    catchment_area_km2: NonNeg
    base_flow_m3s: NonNeg = 20.0
    runoff_coeff: Annotated[float, Field(ge=0, le=1)] = 0.35


class WeatherObservation(Frozen):
    ts: AwareDatetime
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]
    precipitation_mm_h: NonNeg
    temperature_c: float
    cloud_cover_pct: Annotated[float, Field(ge=0, le=100)]
    hourly_precipitation_48h: Annotated[tuple[NonNeg, ...], Field(max_length=72)]
    is_live: bool = True


# --- Sprint 4: Fleet, Sites, & Multi-Tenancy -------------------------------------------
HydrologyPreset = Literal["monsoon", "glacial_melt", "rain_fed"]
Mode = Literal["individual", "global"]


class Coordinates(Frozen):
    lat: Annotated[float, Field(ge=-90, le=90)]
    lon: Annotated[float, Field(ge=-180, le=180)]

    def coarsen(self, step: float = 0.1) -> Coordinates:
        """Coarsen mountain coordinates for privacy when displaying user plants on Global map."""
        import math
        return Coordinates(
            lat=round(math.floor(self.lat / step) * step, 2),
            lon=round(math.floor(self.lon / step) * step, 2),
        )


class SiteSpecInput(Frozen):
    name: Annotated[str, Field(min_length=3, max_length=120)]
    coordinates: Coordinates
    capacity_mw: Annotated[float, Field(gt=0, le=2000)]
    head_m: Annotated[float, Field(gt=0, le=2500)]
    design_flow_m3s: Annotated[float, Field(gt=0, le=1000)]
    catchment_area_km2: Annotated[float, Field(gt=0, le=50000)]
    preset: HydrologyPreset = "monsoon"
    is_public: bool = False


class Site(Frozen):
    id: Annotated[str, Field(pattern=r"^[a-z0-9_-]{1,64}$")]
    user_id: str | None = None
    name: str
    coordinates: Coordinates
    capacity_mw: float
    head_m: float
    design_flow_m3s: float
    catchment_area_km2: float
    preset: HydrologyPreset = "monsoon"
    is_seeded: bool = False
    is_public: bool = False
    created_at: AwareDatetime


class SiteSummary(Frozen):
    id: str
    name: str
    coordinates: Coordinates
    capacity_mw: float
    preset: HydrologyPreset
    is_seeded: bool
    is_public: bool
    alert_tier: Severity = Severity.NORMAL
    current_silt_ppm: float = 0.0
    current_discharge_m3s: float = 0.0


class HourRecord(Frozen):
    site_id: str
    hour_start_utc: AwareDatetime
    discharge_m3s: float
    silt_ppm: float
    alert_tier: Severity
    safety_verdict: VerdictStatus


class FleetSnapshot(Frozen):
    timestamp: AwareDatetime
    mode: Mode
    total_sites: int
    active_warnings: int
    active_critical: int
    sites: tuple[SiteSummary, ...]


# --- Sprint 5: Energy Revenue Outlook & Operational Economics -------------------------
MANDATORY_FINANCIAL_DISCLAIMER: str = (
    "SIMULATED SCENARIO FOR OPERATIONAL & EDUCATIONAL PLANNING ONLY. "
    "DOES NOT CONSTITUTE FINANCIAL, INVESTMENT, COMMODITY, OR LEGAL ADVICE. "
    "PROJECTIONS ARE DERIVED FROM STYLIZED HYDROLOGICAL SIMULATIONS."
)


class EconomicOutlook(StrEnum):
    FAVORABLE = "favorable"
    NEUTRAL = "neutral"
    ADVERSE = "adverse"


class IllustrativeStance(StrEnum):
    INVEST = "accumulate_generation"
    HOLD = "maintain_baseload"
    HEDGE = "preserve_capital_protect_equipment"


class EconomicInputs(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    horizon_hours: Literal[24, 72, 168] = 24
    ppa_tariff_npr_kwh: float = Field(ge=0.5, le=50.0, default=4.80)
    overhaul_cost_npr: float = Field(ge=100_000.0, le=50_000_000.0, default=8_000_000.0)
    fixed_om_cost_per_day_npr: float = Field(ge=0.0, default=50_000.0)


class DeterministicFinancialMetrics(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    expected_energy_mwh: float = Field(ge=0.0)
    baseline_revenue_npr: float = Field(ge=0.0)
    realized_revenue_npr: float = Field(ge=0.0)
    revenue_at_risk_npr: float = Field(ge=0.0)
    avoided_wear_cost_npr: float = Field(ge=0.0)
    net_economic_benefit_npr: float
    erosion_depth_mitigated_mm: float = Field(ge=0.0)
    outlook: EconomicOutlook
    confidence: float = Field(ge=0.0, le=1.0)
    top_drivers: tuple[str, ...] = Field(max_length=5)


class RevenueOutlookReport(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    metrics: DeterministicFinancialMetrics
    executive_summary: str = Field(max_length=1000)
    illustrative_stance: IllustrativeStance
    disclaimer: str = Field(default=MANDATORY_FINANCIAL_DISCLAIMER)
    generated_at: AwareDatetime
    advisory: Literal[True] = True

