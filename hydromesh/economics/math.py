"""Deterministic Mathematical Formulation for Hydropower Energy Economics & Runner Wear.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Pure Math Engine for the Dam's Financial Report.
1. Megawatt-Hours (MWh): Converts falling mountain water (flow Q and drop height H)
   into real electricity generation.
2. Nepal PPA Revenue: Multiplies electricity produced by the official Nepal Electricity Authority
   tariff (e.g. NPR 4.80 per kWh = NPR 4,800 per MWh).
3. Abrasive Sand Wear (IEC 62364): Calculates how many millimeters of stainless steel
   sand erosion are avoided when our operators throttle gates during muddy floods.
4. Total Economic Benefit: Avoided repair costs minus any briefly curtailed electricity sales.
5. Invariant G1 & G2: Pure Python math. Zero LLM hallucinations. Zero actuator access.
"""

from __future__ import annotations

import math
from typing import Sequence

from hydromesh.schemas import (
    DeterministicFinancialMetrics,
    EconomicInputs,
    EconomicOutlook,
    HydroPlantSpec,
)

# Standard Physical Constants
ETA_TURBINE_GENERATOR: float = 0.89  # Combined water-to-wire efficiency
RHO_WATER_KG_M3: float = 1000.0      # Density of water (kg/m3)
GRAVITY_M_S2: float = 9.81           # Acceleration due to gravity (m/s2)

# IEC 62364 Hydro-Abrasive Wear Standard Constants (Francis Runner in Himalayan Quartz)
KM_STAINLESS_13CR4NI: float = 1.25   # Material abrasion resistance factor
KHARD_QUARTZ: float = 1.8            # Mineral hardness factor (Mohs hardness ~7.0)
W_CRITICAL_DEPTH_MM: float = 3.5     # Maximum allowable runner erosion depth before mandatory refurbishment
DESANDER_TRAP_EFFICIENCY: float = 0.70  # Baseline desander basin sediment removal efficiency


def calculate_power_output_mw(
    discharge_m3s: float,
    head_m: float,
    rated_capacity_mw: float,
    efficiency: float = ETA_TURBINE_GENERATOR,
) -> float:
    """Calculate instantaneous electrical power output in Megawatts (MW).

    Formula: P = min(eta * rho * g * Q * H * 1e-6, P_rated)
    """
    q_safe = max(0.0, float(discharge_m3s))
    h_safe = max(0.0, float(head_m))
    rated_safe = max(0.0, float(rated_capacity_mw))

    raw_mw = efficiency * RHO_WATER_KG_M3 * GRAVITY_M_S2 * q_safe * h_safe * 1e-6
    return min(raw_mw, rated_safe)


def calculate_iec62364_erosion_depth_mm(
    silt_ppm: float,
    head_m: float,
    duration_hours: float = 1.0,
) -> float:
    """Calculate turbine runner blade erosion depth in millimeters per IEC 62364 standard.

    Formula: Delta W = 1e-9 * K_m * C * (W_rel)^2.5 * K_hardness * duration_hours
    Where relative velocity W_rel = sqrt(2 * g * H_net).
    """
    c_silt = max(0.0, float(silt_ppm))
    h_net = max(0.0, float(head_m))
    hours = max(0.0, float(duration_hours))

    if c_silt <= 0.0 or h_net <= 0.0 or hours <= 0.0:
        return 0.0

    w_rel = math.sqrt(2.0 * GRAVITY_M_S2 * h_net)
    rate_mm_per_hour = 1e-9 * KM_STAINLESS_13CR4NI * c_silt * (w_rel**2.5) * KHARD_QUARTZ
    return rate_mm_per_hour * hours


def compute_deterministic_financial_metrics(
    plant: HydroPlantSpec,
    inputs: EconomicInputs,
    hourly_discharge_m3s: Sequence[float],
    hourly_silt_ppm: Sequence[float],
) -> DeterministicFinancialMetrics:
    """Calculate deterministic MWh generation, PPA revenue, revenue at risk, and IEC 62364 wear savings.

    Guarantees:
    - Invariant G1: Pure deterministic mathematics; zero LLM generation.
    - Zero discharge produces strictly zero MWh and zero revenue.
    - Clamped, strictly bounded inputs.
    """
    horizon = inputs.horizon_hours
    tariff_npr_per_mwh = inputs.ppa_tariff_npr_kwh * 1000.0  # 1 MWh = 1,000 kWh

    # Normalize hourly profile to requested horizon length
    n_hours = min(horizon, len(hourly_discharge_m3s))
    if n_hours == 0:
        return DeterministicFinancialMetrics(
            expected_energy_mwh=0.0,
            baseline_revenue_npr=0.0,
            realized_revenue_npr=0.0,
            revenue_at_risk_npr=0.0,
            avoided_wear_cost_npr=0.0,
            net_economic_benefit_npr=0.0,
            erosion_depth_mitigated_mm=0.0,
            outlook=EconomicOutlook.NEUTRAL,
            confidence=0.95,
            top_drivers=("No hydrological flow data available for requested horizon.",),
        )

    expected_energy_mwh = 0.0
    baseline_revenue_npr = 0.0
    realized_revenue_npr = 0.0

    wear_unmitigated_mm = 0.0
    wear_mitigated_mm = 0.0
    max_silt_ppm = 0.0

    curtailed_hours = 0
    flushing_hours = 0

    for t in range(n_hours):
        q_raw = max(0.0, hourly_discharge_m3s[t])
        silt_raw = max(0.0, hourly_silt_ppm[t]) if t < len(hourly_silt_ppm) else 300.0
        max_silt_ppm = max(max_silt_ppm, silt_raw)

        # 1. Unconstrained Baseline Generation (Without Curtailment)
        p_base_mw = calculate_power_output_mw(
            discharge_m3s=q_raw,
            head_m=plant.head_m,
            rated_capacity_mw=plant.capacity_mw,
        )
        baseline_revenue_npr += p_base_mw * 1.0 * tariff_npr_per_mwh

        # 2. Mitigated/Effective Generation Under Operational Protection
        # If silt exceeds critical threshold (>3000 PPM), plant throttles intake by 40% and flushes
        # If silt is in warning tier (>=1200 PPM), desander flush bypasses ~15% flow
        if silt_raw > 3000.0:
            q_eff = q_raw * 0.50  # Throttled to protect runner
            curtailed_hours += 1
            flushing_hours += 1
            silt_filtered = silt_raw * (1.0 - DESANDER_TRAP_EFFICIENCY)
        elif silt_raw >= 1200.0:
            q_eff = q_raw * 0.85  # Modest bypass for desander continuous flushing
            flushing_hours += 1
            silt_filtered = silt_raw * (1.0 - DESANDER_TRAP_EFFICIENCY * 0.8)
        else:
            q_eff = q_raw
            silt_filtered = silt_raw * 0.50  # Normal quiescent settling basin removal

        p_eff_mw = calculate_power_output_mw(
            discharge_m3s=q_eff,
            head_m=plant.head_m,
            rated_capacity_mw=plant.capacity_mw,
        )
        expected_energy_mwh += p_eff_mw * 1.0
        realized_revenue_npr += p_eff_mw * 1.0 * tariff_npr_per_mwh

        # 3. Cumulative Runner Erosion (IEC 62364)
        wear_unmitigated_mm += calculate_iec62364_erosion_depth_mm(silt_raw, plant.head_m, duration_hours=1.0)
        wear_mitigated_mm += calculate_iec62364_erosion_depth_mm(silt_filtered, plant.head_m, duration_hours=1.0)

    # Scale to full horizon if series length was shorter than horizon
    if n_hours < horizon:
        scale = horizon / n_hours
        expected_energy_mwh *= scale
        baseline_revenue_npr *= scale
        realized_revenue_npr *= scale
        wear_unmitigated_mm *= scale
        wear_mitigated_mm *= scale

    # Financial Derivations
    revenue_at_risk_npr = max(0.0, baseline_revenue_npr - realized_revenue_npr)
    erosion_depth_mitigated_mm = max(0.0, wear_unmitigated_mm - wear_mitigated_mm)

    # Avoided overhaul cost: (depth_mitigated / critical_depth) * overhaul_cost
    fraction_overhaul_saved = min(1.0, erosion_depth_mitigated_mm / W_CRITICAL_DEPTH_MM)
    avoided_wear_cost_npr = fraction_overhaul_saved * inputs.overhaul_cost_npr

    # Net Economic Benefit: Avoided runner damage savings minus forfeited generation revenue
    net_economic_benefit_npr = avoided_wear_cost_npr - revenue_at_risk_npr

    # Deterministic Categorical Outlook Scoring (Section 3.4)
    if baseline_revenue_npr <= 0.0:
        outlook = EconomicOutlook.NEUTRAL
    elif revenue_at_risk_npr < (0.05 * baseline_revenue_npr) and wear_unmitigated_mm < 0.01:
        outlook = EconomicOutlook.FAVORABLE
    elif revenue_at_risk_npr > (0.25 * baseline_revenue_npr) or max_silt_ppm > 3000.0:
        outlook = EconomicOutlook.ADVERSE
    else:
        outlook = EconomicOutlook.NEUTRAL

    # Horizon-based confidence decay
    confidence = 0.95 if horizon == 24 else 0.90 if horizon == 72 else 0.85

    # Top Economic Drivers Ranking
    drivers: list[str] = []
    if max_silt_ppm > 3000.0:
        drivers.append(
            f"Critical quartz silt surge ({max_silt_ppm:.0f} PPM) forces proactive intake throttling, "
            f"protecting NPR {avoided_wear_cost_npr:,.0f} in runner refurbishments."
        )
    elif max_silt_ppm >= 1200.0:
        drivers.append(
            f"Elevated monsoon sediment ({max_silt_ppm:.0f} PPM) triggers continuous desander flushing "
            f"mitigating {erosion_depth_mitigated_mm:.3f} mm runner wear."
        )

    if revenue_at_risk_npr > 0.0:
        drivers.append(
            f"Desander flushing and intake throttling forfend NPR {revenue_at_risk_npr:,.0f} in PPA generation revenue."
        )
    else:
        drivers.append(
            f"River hydrology permits full dispatch at {plant.capacity_mw:.1f} MW rated capacity without curtailment."
        )

    drivers.append(
        f"Projected {horizon}h generation delivers {expected_energy_mwh:,.1f} MWh earning "
        f"NPR {realized_revenue_npr:,.0f} under NPR {inputs.ppa_tariff_npr_kwh:.2f}/kWh PPA tariff."
    )

    return DeterministicFinancialMetrics(
        expected_energy_mwh=round(expected_energy_mwh, 2),
        baseline_revenue_npr=round(baseline_revenue_npr, 2),
        realized_revenue_npr=round(realized_revenue_npr, 2),
        revenue_at_risk_npr=round(revenue_at_risk_npr, 2),
        avoided_wear_cost_npr=round(avoided_wear_cost_npr, 2),
        net_economic_benefit_npr=round(net_economic_benefit_npr, 2),
        erosion_depth_mitigated_mm=round(erosion_depth_mitigated_mm, 4),
        outlook=outlook,
        confidence=confidence,
        top_drivers=tuple(drivers[:5]),
    )
