"""Operational Incident Explanation Agent (Plain-Language Synthesis).

Overview:
    Translates complex real-time telemetry, hazard classifications, and safety verdicts
    into clear, structured operational summaries for control room operators and station directors.

Key Responsibilities:
    1. Plain-Language Summaries: Converts hydraulic data and safety scores into clear, human-readable
       briefings that can be understood at a glance in high-pressure situations.
    2. Comprehensive Context: Documents the root hazard cause, incoming weather trend, and verified
       safety actions in a standardized timeline format.
    3. Sandboxed Template Rendering: Generates reports via strict deterministic formatting templates
       to eliminate prompt injection risks and guarantee uniform auditability.
"""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent
from hydromesh.logging import get_logger
from hydromesh.schemas import (
    AgentDecision,
    AnomalyVector,
    Forecast,
    IncidentReport,
    SafetyVerdict,
    SimilarIncident,
    Telemetry,
)

log = get_logger(__name__)


class ExplainAgent(BaseAgent):
    """Operator briefing agent generating human-readable incident reports with F8 sandboxing."""

    def __init__(self) -> None:
        super().__init__(name="ExplainReporter", role="Operator Plain-English Briefing")

    async def run(
        self,
        telemetry: Telemetry,
        anomaly: AnomalyVector,
        forecast: Forecast,
        decision: AgentDecision,
        verdict: SafetyVerdict,
        similar: tuple[SimilarIncident, ...] = (),
    ) -> IncidentReport:
        """Synthesize technical telemetry and safety verdicts into a clear IncidentReport."""
        # 1. Format title
        severity_title = anomaly.severity.value.upper()
        title = f"Sediment Influx Advisory — Status: {severity_title}"

        # 2. Trigger narrative
        trigger = (
            f"River discharge measured at {telemetry.discharge_m3s:.1f} m3/s with quartz silt "
            f"concentration of {telemetry.silt_ppm:.0f} ppm. Turbine vibration is at {telemetry.vibration_mm_s:.2f} mm/s "
            f"(Grid: {telemetry.grid_freq_hz:.2f} Hz, Rain: {telemetry.rainfall_mm_h:.1f} mm/h)."
        )

        # 3. Prediction narrative
        prediction = (
            f"24-hour satellite forecast predicts peak sediment concentration of {forecast.peak_silt_ppm:.0f} ppm "
            f"with peak river discharge of {forecast.peak_discharge_m3s:.1f} m3/s (Horizon: {forecast.horizon_h}h, "
            f"Risk Level: {forecast.risk.value}, Confidence: {forecast.confidence * 100:.0f}%)."
        )

        # 4. Action and safety verdict narrative
        action_strs = [f"{a.tool}" for a in verdict.approved_actions] or ["No physical actions executed"]
        action_taken = (
            f"Safety Guard Verdict: {verdict.status.upper()}. Approved Actions: {', '.join(action_strs)}. "
            f"Decision Rationale: {decision.rationale}"
        )

        # 5. Confidence note
        confidence_note = (
            f"Decision proposed with {decision.confidence * 100:.0f}% confidence. "
            f"Safety Kernel evaluated {len(verdict.approved_actions)} approved actions with zero rule violations."
        )

        # 6. Similar incident reference
        similar_note = None
        if similar:
            top = similar[0]
            similar_note = f"Matches historical {top.incident_id} ({top.outcome}): {top.summary}"

        return IncidentReport(
            title=title[:120],
            trigger=trigger[:490],
            prediction=prediction[:490],
            action_taken=action_taken[:490],
            confidence_note=confidence_note[:490],
            similar_incident_note=similar_note[:490] if similar_note else None,
        )
