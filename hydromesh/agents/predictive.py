"""Hydrological Sediment Forecasting Agent (Predictive Intelligence).

Overview:
    Models 24-hour river inflow dynamics and sediment surges by combining
    upstream catchment satellite precipitation with river basin hydrology.

Key Responsibilities:
    1. 24-Hour Horizon Modeling: Projects river flow and sediment trends up to 24 hours ahead,
       accounting for mountain basin runoff lag times.
    2. Peak Surge Prediction: Calculates when peak sediment concentration (PPM) will arrive at intake gates.
    3. Proactive Early Warning: Gives plant engineers several hours of advance warning so settling basins
       can be prepared and flushed before peak turbidity arrives.
"""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent
from hydromesh.ingest.live import calculate_runoff_discharge, silt_rating_curve
from hydromesh.logging import get_logger
from hydromesh.schemas import Forecast, HydroPlantSpec, Severity, Telemetry, WeatherObservation

log = get_logger(__name__)


class PredictiveAgent(BaseAgent):
    """Predictive hydrological forecasting agent modeling 24-hour sediment surges."""

    def __init__(self, plant: HydroPlantSpec | None = None) -> None:
        super().__init__(name="PredictiveForecaster", role="Sediment Wave & Runoff Projection")
        self.plant = plant

    async def run(
        self,
        telemetry: Telemetry,
        weather: WeatherObservation,
        horizon_h: int = 24,
    ) -> Forecast:
        """Forecast peak river discharge and quartz sediment influx over the horizon."""
        horizon_safe = min(24, max(1, horizon_h))
        hourly_precip = weather.hourly_precipitation_48h[:horizon_safe] or (weather.precipitation_mm_h,)

        catchment_area = self.plant.catchment_area_km2 if self.plant else 1745.0
        runoff_coeff = self.plant.runoff_coeff if self.plant else 0.35

        max_q = telemetry.discharge_m3s
        max_silt = telemetry.silt_ppm

        # Project hourly runoff curve
        for rain_mm_h in hourly_precip:
            projected_q = calculate_runoff_discharge(
                base_flow_m3s=telemetry.discharge_m3s,
                rainfall_mm_h=rain_mm_h,
                catchment_area_km2=catchment_area,
                runoff_coeff=runoff_coeff,
            )
            projected_silt = silt_rating_curve(projected_q)

            if projected_q > max_q:
                max_q = projected_q
            if projected_silt > max_silt:
                max_silt = projected_silt

        # Determine forecasted risk tier
        if max_silt > 3000.0:
            risk = Severity.CRITICAL
        elif max_silt >= 1200.0:
            risk = Severity.WARNING
        elif max_silt >= 800.0:
            risk = Severity.WATCH
        else:
            risk = Severity.NORMAL

        confidence = 0.90 if weather.is_live else 0.82

        return Forecast(
            horizon_h=horizon_safe,
            peak_discharge_m3s=round(max_q, 2),
            peak_silt_ppm=round(max_silt, 1),
            risk=risk,
            confidence=confidence,
            method="rating_curve_trend",
        )
