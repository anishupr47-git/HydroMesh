"""The Lookout Agent (Triage).

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this agent as the Lookout perched on the tower watching the mountain river.
1. River Speed & Mud Check: It watches how fast the water is moving and checks
   if the water is clean and clear or brown and gritty.
2. Traffic Light Alert:
   - Green (Normal): Clean mountain water (under 1,200 sand grains per million).
   - Yellow (Warning): Muddy water (1,200 to 3,000 sand grains per million). Turbines need protection!
   - Red (Critical): Heavy mud flood (over 3,000 sand grains per million). Extreme emergency!
3. Glitch Detector: If a sensor suddenly jumps from 0 to 10,000 in one second,
   it knows the sensor is broken and alerts the humans!
"""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent
from hydromesh.logging import get_logger
from hydromesh.schemas import AnomalyVector, Severity, Telemetry

log = get_logger(__name__)


class TriageAgent(BaseAgent):
    """Fast sensor plausibility and anomaly vector evaluation agent."""

    def __init__(self, *, max_discharge_rate_m3s_s: float = 20.0) -> None:
        super().__init__(name="TriageLookout", role="Sensor Plausibility & Risk Assessment")
        self._max_rate = max_discharge_rate_m3s_s

    async def run(
        self,
        telemetry: Telemetry,
        history: tuple[Telemetry, ...] = (),
    ) -> AnomalyVector:
        """Evaluate sensor plausibility and calculate the anomaly risk vector."""
        silt = telemetry.silt_ppm
        discharge = telemetry.discharge_m3s
        freq = telemetry.grid_freq_hz

        # 1. Sensor plausibility and rate-of-change check
        confidence = 0.95
        if history:
            prev = history[-1]
            dt = max(1.0, (telemetry.ts - prev.ts).total_seconds())
            dq_dt = abs(discharge - prev.discharge_m3s) / dt
            if dq_dt > self._max_rate:
                # Plausibility penalty: sudden unphysical jump
                confidence = max(0.50, confidence - 0.35)
                log.warning("unphysical_discharge_rate", dq_dt=dq_dt, limit=self._max_rate)

        # 2. Risk evaluations
        silt_risk = min(1.0, max(0.0, silt / 3500.0))
        grid_risk = min(1.0, max(0.0, abs(freq - 50.0) / 2.0))
        # Cavitation risk increases when vibration is elevated above 3.5 mm/s
        cavitation_risk = min(1.0, max(0.0, (telemetry.vibration_mm_s - 1.2) / 4.0))

        # 3. Severity classification (Green / Yellow / Red)
        if silt > 3000.0 or telemetry.vibration_mm_s > 4.5:
            severity = Severity.CRITICAL
        elif silt >= 1200.0 or telemetry.vibration_mm_s >= 2.8:
            severity = Severity.WARNING
        elif silt >= 800.0:
            severity = Severity.WATCH
        else:
            severity = Severity.NORMAL

        return AnomalyVector(
            severity=severity,
            cavitation_risk=round(cavitation_risk, 3),
            silt_risk=round(silt_risk, 3),
            grid_risk=round(grid_risk, 3),
            confidence=round(confidence, 3),
        )
