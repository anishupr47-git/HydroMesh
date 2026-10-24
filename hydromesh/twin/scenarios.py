"""Pure, seed-free river/grid input profiles for the digital twin: t (seconds) -> Inputs."""

from __future__ import annotations

import math
from collections.abc import Callable
from typing import NamedTuple


class Inputs(NamedTuple):
    q_river_m3s: float
    silt_ppm: float
    rainfall_mm_h: float
    freq_hz: float
    derate: float  # 1.0 = full grid capacity


Scenario = Callable[[float], Inputs]

# Sediment rating curve C = a * Q^b, calibrated to 300 ppm @ 340 m3/s and 3200 ppm @ 900 m3/s.
_A, _B = 2.096e-4, 2.432


def rating_curve(q_m3s: float) -> float:
    return float(_A * q_m3s**_B)


def _smooth(x: float) -> float:
    """Smoothstep on [0, 1]: C1-continuous ramp, no solver-visible kinks."""
    x = min(max(x, 0.0), 1.0)
    return x * x * (3.0 - 2.0 * x)


def normal(t: float) -> Inputs:
    q = 340.0 + 25.0 * math.sin(math.tau * t / 86_400.0)
    return Inputs(q, rating_curve(q), 0.0, 50.0, 1.0)


def monsoon_surge(t: float) -> Inputs:
    """340 -> 900 m3/s over 2 h (silt peaks ~3200 ppm), 6 h plateau, 4 h recession."""
    ramp = _smooth((t - 3_600.0) / 7_200.0) - _smooth((t - 32_400.0) / 14_400.0)
    q = 340.0 + 560.0 * ramp
    return Inputs(q, rating_curve(q), 30.0 * ramp, 50.0, 1.0)


def inflow_surge(t: float) -> Inputs:
    """Flash rise 340 -> 700 m3/s in 10 min (~1700 ppm): tests reaction time, not capacity."""
    ramp = _smooth((t - 1_800.0) / 600.0)
    q = 340.0 + 360.0 * ramp
    return Inputs(q, rating_curve(q), 20.0 * ramp, 50.0, 1.0)


SCENARIOS: dict[str, Scenario] = {
    "normal": normal,
    "monsoon_surge": monsoon_surge,
    "inflow_surge": inflow_surge,
}
