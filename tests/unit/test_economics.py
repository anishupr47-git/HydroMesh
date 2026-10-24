"""Unit and mathematical test suite for Hydropower Energy Economics & IEC 62364 Wear Model."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from hydromesh.economics.math import (
    calculate_iec62364_erosion_depth_mm,
    calculate_power_output_mw,
    compute_deterministic_financial_metrics,
)
from hydromesh.schemas import (
    EconomicInputs,
    EconomicOutlook,
    HydroPlantSpec,
)


@pytest.fixture
def tamakoshi_spec() -> HydroPlantSpec:
    return HydroPlantSpec(
        id="upper_tamakoshi",
        name="Upper Tamakoshi Hydropower Project",
        capacity_mw=456.0,
        river_basin="Koshi",
        latitude=27.848,
        longitude=86.136,
        design_flow_m3s=66.0,
        head_m=822.0,
        catchment_area_km2=1745.0,
        base_flow_m3s=35.0,
        runoff_coeff=0.42,
    )


def test_zero_discharge_produces_zero_mwh_and_zero_revenue(tamakoshi_spec: HydroPlantSpec) -> None:
    """Test 1: Zero river flow produces strictly 0 MWh and 0 NPR revenue."""
    inputs = EconomicInputs(horizon_hours=24, ppa_tariff_npr_kwh=4.80)
    zero_flow = [0.0] * 24
    zero_silt = [0.0] * 24

    metrics = compute_deterministic_financial_metrics(
        plant=tamakoshi_spec,
        inputs=inputs,
        hourly_discharge_m3s=zero_flow,
        hourly_silt_ppm=zero_silt,
    )

    assert metrics.expected_energy_mwh == 0.0
    assert metrics.baseline_revenue_npr == 0.0
    assert metrics.realized_revenue_npr == 0.0
    assert metrics.revenue_at_risk_npr == 0.0
    assert metrics.avoided_wear_cost_npr == 0.0
    assert metrics.net_economic_benefit_npr == 0.0
    assert metrics.erosion_depth_mitigated_mm == 0.0
    assert metrics.outlook == EconomicOutlook.NEUTRAL


def test_extreme_silt_calculates_positive_avoided_wear_savings(tamakoshi_spec: HydroPlantSpec) -> None:
    """Test 2: Extreme quartz sediment (>3000 PPM) triggers curtailment and calculates positive avoided wear savings."""
    inputs = EconomicInputs(horizon_hours=24, ppa_tariff_npr_kwh=5.0, overhaul_cost_npr=8_000_000.0)
    flood_flow = [66.0] * 24
    critical_silt = [3500.0] * 24  # Critical quartz pulse

    metrics = compute_deterministic_financial_metrics(
        plant=tamakoshi_spec,
        inputs=inputs,
        hourly_discharge_m3s=flood_flow,
        hourly_silt_ppm=critical_silt,
    )

    # Effective flow is curtailed to protect runner
    assert metrics.revenue_at_risk_npr > 0.0
    assert metrics.erosion_depth_mitigated_mm > 0.0
    assert metrics.avoided_wear_cost_npr > 0.0
    assert metrics.outlook == EconomicOutlook.ADVERSE
    assert len(metrics.top_drivers) >= 2


def test_clamped_inputs_strictly_reject_invalid_bounds() -> None:
    """Test 3: Pydantic strictly rejects negative tariffs, invalid overhaul costs, or unlisted horizons."""
    # Negative tariff rejected
    with pytest.raises(ValidationError):
        EconomicInputs(ppa_tariff_npr_kwh=-1.0)

    # Tariff above max limit rejected
    with pytest.raises(ValidationError):
        EconomicInputs(ppa_tariff_npr_kwh=100.0)

    # Overhaul cost below min limit rejected
    with pytest.raises(ValidationError):
        EconomicInputs(overhaul_cost_npr=50_000.0)

    # Invalid horizon (e.g. 48 hours instead of 24, 72, 168)
    with pytest.raises(ValidationError):
        EconomicInputs(horizon_hours=48)  # type: ignore[arg-type]


def test_horizon_scaling_and_confidence(tamakoshi_spec: HydroPlantSpec) -> None:
    """Test 4: Verify confidence decays with horizon: 24h -> 0.95, 72h -> 0.90, 168h -> 0.85."""
    flow = [40.0] * 24
    silt = [400.0] * 24

    # 24h
    m24 = compute_deterministic_financial_metrics(tamakoshi_spec, EconomicInputs(horizon_hours=24), flow, silt)
    assert m24.confidence == 0.95

    # 72h
    m72 = compute_deterministic_financial_metrics(tamakoshi_spec, EconomicInputs(horizon_hours=72), flow, silt)
    assert m72.confidence == 0.90
    assert m72.expected_energy_mwh > m24.expected_energy_mwh

    # 168h
    m168 = compute_deterministic_financial_metrics(tamakoshi_spec, EconomicInputs(horizon_hours=168), flow, silt)
    assert m168.confidence == 0.85
    assert m168.expected_energy_mwh > m72.expected_energy_mwh


def test_power_output_and_iec62364_formula_correctness() -> None:
    """Test 5: Mathematical precision of instantaneous power and erosion depth."""
    # 10 m3/s at 100m head with 0.89 efficiency:
    # P = 0.89 * 1000 * 9.81 * 10 * 100 * 1e-6 = 8.7309 MW
    p = calculate_power_output_mw(discharge_m3s=10.0, head_m=100.0, rated_capacity_mw=50.0)
    assert round(p, 4) == 8.7309

    # Capped at rated capacity
    p_capped = calculate_power_output_mw(discharge_m3s=100.0, head_m=100.0, rated_capacity_mw=10.0)
    assert p_capped == 10.0

    # Erosion depth increases monotonically with silt PPM
    w1 = calculate_iec62364_erosion_depth_mm(silt_ppm=500.0, head_m=200.0)
    w2 = calculate_iec62364_erosion_depth_mm(silt_ppm=2000.0, head_m=200.0)
    assert w2 > w1
    assert w1 > 0.0


@pytest.mark.asyncio
async def test_energy_revenue_agent_deterministic_run(tamakoshi_spec: HydroPlantSpec) -> None:
    """Test 6: EnergyRevenueOutlookAgent generates deterministic report with mandatory disclaimer."""
    from hydromesh.agents.revenue import EnergyRevenueOutlookAgent
    from hydromesh.schemas import MANDATORY_FINANCIAL_DISCLAIMER

    agent = EnergyRevenueOutlookAgent(llm_client=None)
    inputs = EconomicInputs(horizon_hours=24, ppa_tariff_npr_kwh=4.80)
    report = await agent.run(
        plant=tamakoshi_spec,
        inputs=inputs,
        hourly_discharge_m3s=[50.0] * 24,
        hourly_silt_ppm=[1500.0] * 24,
    )
    assert report.disclaimer == MANDATORY_FINANCIAL_DISCLAIMER
    assert report.advisory is True
    assert "Upper Tamakoshi" in report.executive_summary
    assert report.metrics.expected_energy_mwh > 0.0


def test_revenue_outlook_api_endpoint() -> None:
    """Test 7: Test FastAPI POST /api/plants/{site_id}/revenue-outlook endpoint."""
    from fastapi.testclient import TestClient
    from hydromesh.api.app import create_app

    app = create_app()
    with TestClient(app) as client:
        res = client.post(
            "/api/plants/upper_tamakoshi/revenue-outlook",
            json={"horizon_hours": 24, "ppa_tariff_npr_kwh": 4.80},
        )
        assert res.status_code == 200
        data = res.json()
        assert "metrics" in data
        assert "expected_energy_mwh" in data["metrics"]
        assert data["advisory"] is True

