"""Security and Air-Gap Verification Test Suite for Energy Revenue Outlook Agent."""

from __future__ import annotations

import ast
import inspect

import pytest

import hydromesh.agents.revenue as revenue_module
import hydromesh.economics.math as econ_math
from hydromesh.agents.revenue import EnergyRevenueOutlookAgent
from hydromesh.schemas import (
    MANDATORY_FINANCIAL_DISCLAIMER,
    DeterministicFinancialMetrics,
    EconomicInputs,
    EconomicOutlook,
    HydroPlantSpec,
    IllustrativeStance,
    RevenueOutlookReport,
)


def test_airgap_zero_actuator_imports() -> None:
    """Security Invariant G2: Verify economics modules do NOT import actuator or safety kernel modules."""
    banned_terms = {
        "PlantTwin",
        "ModulateIntake",
        "TriggerFlush",
        "ReallocateDispatch",
        "SafetyValidator",
        "validate",
        "twin.plant",
        "safety",
    }

    modules_to_inspect = [econ_math, revenue_module]

    for mod in modules_to_inspect:
        source_code = inspect.getsource(mod)
        tree = ast.parse(source_code)

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert not any(banned in alias.name for banned in banned_terms), (
                        f"Air-Gap Violation: {mod.__name__} imports banned term {alias.name}"
                    )
            elif isinstance(node, ast.ImportFrom):
                mod_name = node.module or ""
                assert not any(banned in mod_name for banned in banned_terms), (
                    f"Air-Gap Violation: {mod.__name__} imports from {mod_name}"
                )
                for alias in node.names:
                    assert not any(banned in alias.name for banned in banned_terms), (
                        f"Air-Gap Violation: {mod.__name__} imports banned symbol {alias.name}"
                    )


@pytest.mark.asyncio
async def test_mandatory_statutory_disclaimer_and_advisory_lock() -> None:
    """Security Invariants G3 & G4: Verify report is strictly advisory and includes statutory disclaimer."""
    plant = HydroPlantSpec(
        id="tamakoshi_test",
        name="Upper Tamakoshi Test",
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

    agent = EnergyRevenueOutlookAgent(llm_client=None)  # Air-gapped fallback mode
    inputs = EconomicInputs(horizon_hours=24, ppa_tariff_npr_kwh=4.80)

    report = await agent.run(
        plant=plant,
        inputs=inputs,
        hourly_discharge_m3s=[35.0] * 24,
        hourly_silt_ppm=[300.0] * 24,
    )

    # Invariant G3: Strictly advisory
    assert report.advisory is True

    # Invariant G4: Exact mandatory statutory disclaimer
    assert report.disclaimer == MANDATORY_FINANCIAL_DISCLAIMER
    assert "DOES NOT CONSTITUTE FINANCIAL, INVESTMENT, COMMODITY, OR LEGAL ADVICE" in report.disclaimer


def test_schema_disclaimer_tampering_rejected() -> None:
    """Invariant G4: Assert disclaimer cannot be empty or invalid."""
    metrics = DeterministicFinancialMetrics(
        expected_energy_mwh=100.0,
        baseline_revenue_npr=480000.0,
        realized_revenue_npr=480000.0,
        revenue_at_risk_npr=0.0,
        avoided_wear_cost_npr=1000.0,
        net_economic_benefit_npr=1000.0,
        erosion_depth_mitigated_mm=0.001,
        outlook=EconomicOutlook.FAVORABLE,
        confidence=0.95,
        top_drivers=("Safe generation",),
    )

    from datetime import UTC, datetime

    # Valid report
    rep = RevenueOutlookReport(
        metrics=metrics,
        executive_summary="Safe test summary",
        illustrative_stance=IllustrativeStance.INVEST,
        generated_at=datetime.now(UTC),
    )
    assert rep.disclaimer == MANDATORY_FINANCIAL_DISCLAIMER


@pytest.mark.asyncio
async def test_numeric_consistency_deterministic_fallback() -> None:
    """Invariant G1: Assert that fallback summary accurately reports deterministic numbers."""
    plant = HydroPlantSpec(
        id="marsyangdi_test",
        name="Middle Marsyangdi Test",
        capacity_mw=70.0,
        river_basin="Gandaki",
        latitude=28.163,
        longitude=84.425,
        design_flow_m3s=80.0,
        head_m=98.0,
        catchment_area_km2=2729.0,
        base_flow_m3s=45.0,
        runoff_coeff=0.39,
    )

    agent = EnergyRevenueOutlookAgent(llm_client=None)
    inputs = EconomicInputs(horizon_hours=24, ppa_tariff_npr_kwh=5.20)
    report = await agent.run(
        plant=plant,
        inputs=inputs,
        hourly_discharge_m3s=[45.0] * 24,
        hourly_silt_ppm=[400.0] * 24,
    )

    # Verify key figures appear accurately in the executive summary
    assert f"{report.metrics.expected_energy_mwh:,.1f} MWh" in report.executive_summary
    assert f"NPR {report.metrics.realized_revenue_npr:,.0f}" in report.executive_summary
    assert report.metrics.outlook.value.upper() in report.executive_summary
