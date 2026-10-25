"""Catchment Runoff Modeling and Live Telemetry Generation.

Overview:
    Calculates instantaneous river discharge and suspended sediment concentration (PPM)
    from mountain precipitation observations and river basin geomorphology.

Physical Hydrology Principles:
    1. Catchment Rainfall-Runoff Transformation: Converts precipitation rate (mm/h) across the
       catchment area into surface runoff discharge (m³/s) using calibrated runoff coefficients.
    2. Non-Linear Sediment Rating Curve: Models suspended quartz silt concentration as a power-law
       function of river discharge (C = a · Q^b), calibrated against Himalayan river field measurements.
    3. Immutable Telemetry Generation: Assembles real-time readings into strictly validated, immutable
       telemetry records for safety verification and agent evaluation.
"""

from __future__ import annotations

import math

from hydromesh.logging import get_logger
from hydromesh.schemas import HydroPlantSpec, Telemetry, WeatherObservation

log = get_logger(__name__)

# Calibrated Himalayan quartz rating curve: C = a * Q^b
# Calibrated: 300 PPM @ 340 m3/s, ~3,200 PPM @ 900 m3/s
_RATING_CURVE_A = 2.096e-4
_RATING_CURVE_B = 2.432


def silt_rating_curve(discharge_m3s: float) -> float:
    """Calculate quartz sediment concentration in PPM from river discharge."""
    q_safe = max(0.0, float(discharge_m3s))
    return float(_RATING_CURVE_A * (q_safe**_RATING_CURVE_B))


def calculate_runoff_discharge(
    base_flow_m3s: float,
    rainfall_mm_h: float,
    catchment_area_km2: float,
    runoff_coeff: float = 0.35,
    attenuation_factor: float = 0.15,
) -> float:
    """Calculate total river discharge from baseflow and catchment precipitation.

    Hydrological Rational Method adaptation:
    - 1 mm/h rainfall over 1 km2 = (1e-3 m * 1e6 m2) / 3600 s = 1/3.6 m3/s = ~0.2778 m3/s.
    - Catchment attenuation factor accounts for mountain valley retention and peak flattening.
    """
    precip = max(0.0, float(rainfall_mm_h))
    area = max(0.0, float(catchment_area_km2))
    coeff = min(1.0, max(0.0, float(runoff_coeff)))

    instantaneous_runoff = (precip * area * coeff) / 3.6
    effective_runoff = instantaneous_runoff * attenuation_factor
    return max(0.0, float(base_flow_m3s) + effective_runoff)


class LiveIngestionEngine:
    """Engine that pairs live satellite weather with physical plant specifications."""

    def __init__(self, plant: HydroPlantSpec, *, max_discharge_rate_m3s_per_s: float = 2.0) -> None:
        self.plant = plant
        self._max_rate = max_discharge_rate_m3s_per_s
        self._last_q: float = plant.base_flow_m3s
        self._last_ts: float = 0.0

    def ingest(self, weather: WeatherObservation, now_monotonic_s: float | None = None) -> Telemetry:
        """Convert a live weather observation into a validated, frozen Telemetry record."""
        target_q = calculate_runoff_discharge(
            base_flow_m3s=self.plant.base_flow_m3s,
            rainfall_mm_h=weather.precipitation_mm_h,
            catchment_area_km2=self.plant.catchment_area_km2,
            runoff_coeff=self.plant.runoff_coeff,
        )

        # Rate-of-change smoothing to avoid unphysical numerical shocks
        if self._last_ts > 0.0 and now_monotonic_s is not None:
            dt = max(0.1, now_monotonic_s - self._last_ts)
            max_delta = self._max_rate * dt
            delta = target_q - self._last_q
            clamped_delta = math.copysign(min(abs(delta), max_delta), delta)
            q_river = self._last_q + clamped_delta
        else:
            q_river = target_q

        if now_monotonic_s is not None:
            self._last_ts = now_monotonic_s
        self._last_q = q_river

        # Sediment rating curve
        silt_ppm = silt_rating_curve(q_river)

        # Vibration estimate: baseline 1.2 mm/s, slightly rising with off-design hydraulic shear
        flow_ratio = q_river / max(1.0, self.plant.design_flow_m3s)
        shear_vib = max(0.0, (flow_ratio - 1.0) * 0.8)
        silt_vib = min(2.0, (silt_ppm / 3000.0) * 1.5)
        vibration = 1.2 + shear_vib + silt_vib

        return Telemetry(
            ts=weather.ts,
            discharge_m3s=round(q_river, 2),
            silt_ppm=round(silt_ppm, 1),
            vibration_mm_s=round(vibration, 2),
            grid_freq_hz=50.0,
            rainfall_mm_h=round(weather.precipitation_mm_h, 2),
        )
