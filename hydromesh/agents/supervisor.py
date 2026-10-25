"""Multi-Agent Pipeline Supervisor and Execution Coordinator.

Overview:
    Coordinates the execution sequence of specialized operational agents based on real-time
    environmental hazard severity and plant telemetry.

Key Capabilities:
    1. Dynamic Route Orchestration: Determines which analytical models to execute depending on current risk.
    2. Tiered Execution Paths:
       - Nominal Conditions (Normal): Runs a streamlined, low-latency evaluation cycle.
       - Elevated Risk (Watch / Warning / Critical): Triggers comprehensive multi-agent evaluation
         spanning sediment trend forecasting, vector SOP retrieval, financial modeling, and safety validation.
    3. Deterministic Routing Plans: Generates transparent, verifiable execution schedules ensuring
       every decision step is traceable and predictable.
"""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent
from hydromesh.schemas import AnomalyVector, RoutingPlan, Severity, Telemetry


class SupervisorAgent(BaseAgent):
    """Pipeline supervisor proposing dynamic RoutingPlan based on situational severity."""

    def __init__(self) -> None:
        super().__init__(name="SupervisorCoordinator", role="Pipeline Dynamic Routing")

    async def run(
        self,
        telemetry: Telemetry,
        anomaly: AnomalyVector,
    ) -> RoutingPlan:
        """Evaluate situation and produce the optimal step-by-step agent execution plan."""
        sev = anomaly.severity

        steps: tuple[str, ...]
        if sev in (Severity.CRITICAL, Severity.WARNING):
            steps = ("triage", "predict", "sop_rag", "dispatch", "explain")
            reason = (
                f"High sediment surge ({telemetry.silt_ppm:.0f} ppm, {sev.value}). Full 5-agent pipeline activated."
            )
        elif sev == Severity.WATCH:
            steps = ("triage", "predict", "dispatch", "explain")
            reason = f"Elevated silt detected ({telemetry.silt_ppm:.0f} ppm). Predictive and dispatch pathways active."
        else:
            steps = ("triage", "dispatch")
            reason = f"Normal river conditions ({telemetry.silt_ppm:.0f} ppm). Fast baseline dispatch active."

        return RoutingPlan(steps=steps, reason=reason[:300])
