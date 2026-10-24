"""The Control Room Supervisor Agent.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this agent as the Control Room Shift Supervisor.
1. Orchestrating the Team: It decides which robot helpers need to jump into action.
2. Fast vs Deep Path:
   - On calm, clean-water days, it takes the express lane (quick triage and normal dispatch).
   - When a storm or mud wave approaches, it calls all 5 helpers together: the lookout,
     the weather forecaster, the rulebook reader, the gate strategist, and the reporter!
3. Routing Plan: It creates a clear checklist of steps so the whole pipeline runs in order.
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
