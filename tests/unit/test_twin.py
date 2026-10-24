import pytest

from hydromesh.safety import DEFAULT_LIMITS
from hydromesh.schemas import AgentDecision, ModulateIntake, ReallocateDispatch, TriggerFlush
from hydromesh.twin.plant import PlantTwin
from hydromesh.twin.scenarios import SCENARIOS, inflow_surge, monsoon_surge, normal, rating_curve

DT, DAY = 10.0, 86_400.0


def simulate(name: str, *, protect: bool, seed: int = 1) -> PlantTwin:
    twin = PlantTwin(SCENARIOS[name], seed=seed)
    for k in range(int(DAY / DT)):
        tel = twin.step(DT)
        if protect and k % 60 == 0:  # reactive policy, evaluated every 10 simulated minutes
            snap = twin.snapshot()
            for bid, basin in snap.basins.items():
                if basin.sediment_level > 0.55 and not basin.flushing:
                    twin.apply(TriggerFlush(basin_id=bid, duration_mins=30))
            target = 15.0 if tel.silt_ppm > 2500 else 30.0
            for gid in snap.gates:
                twin.apply(ModulateIntake(gate_id=gid, flow_target_m3s=target))
    return twin


def test_rating_curve_calibration_and_monsoon_exceeds_3000_ppm() -> None:
    assert rating_curve(340.0) == pytest.approx(300.0, rel=0.01)
    assert rating_curve(900.0) == pytest.approx(3200.0, rel=0.01)
    assert monsoon_surge(4 * 3600.0).silt_ppm > 3000.0


def test_same_seed_same_telemetry() -> None:
    a, b = PlantTwin(normal, seed=7), PlantTwin(normal, seed=7)
    assert [a.step(DT) for _ in range(300)] == [b.step(DT) for _ in range(300)]


def test_unprotected_monsoon_fills_basins_and_wears_runner() -> None:
    snap = simulate("monsoon_surge", protect=False).snapshot()
    assert all(b.sediment_level > 0.95 for b in snap.basins.values())
    assert 0.002 < snap.runner_wear < 0.01  # fraction of runner life consumed in 24 h


def test_protection_cuts_wear_by_at_least_half() -> None:
    bare = simulate("monsoon_surge", protect=False).snapshot().runner_wear
    guarded = simulate("monsoon_surge", protect=True).snapshot().runner_wear
    assert guarded < 0.5 * bare


def test_flush_drains_basin_and_records_age() -> None:
    twin = PlantTwin(SCENARIOS["monsoon_surge"], seed=1)
    for _ in range(int(6 * 3600 / DT)):
        twin.step(DT)
    before = twin.snapshot().basins[0].sediment_level
    twin.apply(TriggerFlush(basin_id=0, duration_mins=20))
    for _ in range(int(21 * 60 / DT)):
        twin.step(DT)
    after = twin.snapshot().basins[0]
    assert after.sediment_level < before and not after.flushing
    assert after.last_flush_age_mins is not None and after.last_flush_age_mins < 2.0


def test_restarting_a_running_flush_is_ignored_and_dispatch_is_advisory() -> None:
    twin = PlantTwin(normal)
    twin.apply(TriggerFlush(basin_id=0, duration_mins=10))
    twin.step(60.0)
    twin.apply(TriggerFlush(basin_id=0, duration_mins=90))  # must not extend the running flush
    before = twin.snapshot()
    twin.apply(ReallocateDispatch(mw_target=10.0, feeder_priority=("hospital",)))
    assert twin.snapshot() == before


def test_gates_follow_targets_and_cannot_exceed_the_river() -> None:
    twin = PlantTwin(normal)
    twin.apply(ModulateIntake(gate_id=0, flow_target_m3s=10.0))
    for _ in range(60):
        twin.step(DT)
    gates = twin.snapshot().gates
    assert gates[0].flow_m3s == pytest.approx(10.0, abs=0.1)
    assert gates[1].flow_m3s == pytest.approx(30.0, abs=0.1)


# --- Security Finding F3 Regression Tests ----------------------------------------------
def test_f3_atomic_revalidation_rejects_toctou_state_drift() -> None:
    """F3: Verify that if plant state drifts between decision proposal and actuation, apply aborts."""
    twin = PlantTwin(normal)
    # Proposed action for Basin 0 was valid at proposal time
    flush_act = TriggerFlush(basin_id=0, duration_mins=30)

    # But plant state drifts before actuation: Basin 0 has already begun flushing
    twin._flush_left[0] = 600.0  # 10 minutes left of active flush

    # Atomic revalidation in apply detects Basin 0 is flushing (R7) and rejects execution
    applied = twin.apply(flush_act)
    assert applied is False
    # Verify the running flush was not altered
    assert twin._flush_left[0] == 600.0


def test_f3_atomic_revalidation_with_limits_enforces_safety_bounds() -> None:
    """F3: ModulateIntake exceeding design flow is rejected atomically."""
    twin = PlantTwin(normal)
    unsafe_action = ModulateIntake(gate_id=0, flow_target_m3s=35.0)  # design is 30.0
    applied = twin.apply(unsafe_action, limits=DEFAULT_LIMITS)
    assert applied is False
    assert twin.snapshot().gates[0].flow_m3s == 30.0


def test_inflow_surge_scenario_and_agent_decision_batch_apply() -> None:
    """Verify inflow_surge scenario and batch AgentDecision apply."""
    twin = PlantTwin(inflow_surge)
    twin.step(2100.0)
    tel = twin.step(10.0)
    assert tel.discharge_m3s > 340.0

    # Test AgentDecision passed to apply
    decision = AgentDecision(
        actions=(ModulateIntake(gate_id=0, flow_target_m3s=25.0),),
        rationale="test decision",
        confidence=0.95,
    )
    assert twin.apply(decision) is True

    # Test tuple of actions passed to apply including valid ReallocateDispatch
    crit = twin.snapshot().critical_feeders
    dispatch_act = ReallocateDispatch(mw_target=20.0, feeder_priority=(*crit, "other"))
    assert twin.apply((dispatch_act,)) is True
