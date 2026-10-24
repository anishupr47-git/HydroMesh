from dataclasses import dataclass

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hydromesh.safety import SafetyContext, SafetyLimits, _check, _Reject, validate
from hydromesh.schemas import (
    AgentDecision,
    BasinState,
    GateState,
    ModulateIntake,
    ReallocateDispatch,
    SafetyVerdict,
    TriggerFlush,
)
from tests.factories import decide, make_twin

LIM = SafetyLimits()


def run(
    decision: AgentDecision,
    *,
    ts: tuple[float, ...] = (),
    now: float = 1000.0,
    deterministic_confidence: float = 1.0,
    **twin: object,
) -> SafetyVerdict:
    ctx = SafetyContext(make_twin(**twin), ts, now, deterministic_confidence=deterministic_confidence)
    return validate(decision, ctx, LIM)


@pytest.mark.parametrize(
    ("action", "status", "rule"),
    [
        (ModulateIntake(gate_id=0, flow_target_m3s=20.0), "approved", ""),
        (ModulateIntake(gate_id=9, flow_target_m3s=20.0), "rejected", "R2"),
        (ModulateIntake(gate_id=0, flow_target_m3s=31.0), "rejected", "R5"),
        (TriggerFlush(basin_id=9, duration_mins=30), "rejected", "R2"),
        (TriggerFlush(basin_id=0, duration_mins=4), "rejected", "R6"),
        (TriggerFlush(basin_id=0, duration_mins=91), "rejected", "R6"),
        (TriggerFlush(basin_id=0, duration_mins=30), "approved", ""),
        (ReallocateDispatch(mw_target=61.0, feeder_priority=("hospital", "water_pump")), "rejected", "R9"),
        (ReallocateDispatch(mw_target=40.0, feeder_priority=("school", "hospital", "water_pump")), "rejected", "R10"),
        (ReallocateDispatch(mw_target=40.0, feeder_priority=("water_pump", "hospital", "school")), "approved", ""),
    ],
)
def test_rule_table(action, status, rule) -> None:  # type: ignore[no-untyped-def]
    v = run(decide(action))
    assert v.status == status
    assert rule in "".join(v.reasons)


def test_deep_cut_is_clamped_to_max_reduction() -> None:
    v = run(decide(ModulateIntake(gate_id=0, flow_target_m3s=2.0)))
    assert v.status == "approved"
    assert v.approved_actions[0].flow_target_m3s == pytest.approx(15.0)  # type: ignore[union-attr]
    assert "R3/R4" in v.reasons[0]


def test_clamp_never_turns_a_cut_into_a_raise() -> None:
    gates = {0: GateState(gate_id=0, flow_m3s=3.0, design_flow_m3s=30.0)}  # already below baseload
    v = run(decide(ModulateIntake(gate_id=0, flow_target_m3s=1.0)), gates=gates)
    assert v.approved_actions[0].flow_target_m3s == pytest.approx(3.0)  # type: ignore[union-attr]


def test_flush_blocked_while_running_or_in_cooldown() -> None:
    running = {0: BasinState(basin_id=0, sediment_level=0.9, flushing=True, last_flush_age_mins=None)}
    cooling = {0: BasinState(basin_id=0, sediment_level=0.9, flushing=False, last_flush_age_mins=10.0)}
    rested = {0: BasinState(basin_id=0, sediment_level=0.9, flushing=False, last_flush_age_mins=61.0)}
    d = decide(TriggerFlush(basin_id=0, duration_mins=30))
    assert run(d, basins=running).status == "rejected"
    assert run(d, basins=cooling).status == "rejected"
    assert run(d, basins=rested).status == "approved"


def test_low_confidence_and_empty_need_a_human() -> None:
    assert run(decide(TriggerFlush(basin_id=0, duration_mins=30), confidence=0.79)).status == "needs_human"
    assert run(decide()).status == "needs_human"


def test_rate_limit_counts_only_the_window_and_the_proposed_batch() -> None:
    d = decide(TriggerFlush(basin_id=0, duration_mins=30))
    assert run(d, ts=(990.0, 995.0, 999.0)).status == "rejected"  # 3 recent + 1 > 3
    assert run(d, ts=(10.0, 20.0, 30.0)).status == "approved"  # all older than the 600 s window


def test_hard_violation_beats_low_confidence() -> None:
    d = decide(ModulateIntake(gate_id=9, flow_target_m3s=1.0), confidence=0.1)
    assert run(d).status == "rejected"


# --- Security Finding F1 Regression Tests ----------------------------------------------
def test_f1_deterministic_confidence_clamps_inflated_llm_confidence() -> None:
    """F1: Injected LLM claims confidence=0.99 but deterministic rule/triage agreement is 0.60.

    Verdict strictly produces needs_human, and reason cites the confidence threshold.
    """
    decision = decide(ModulateIntake(gate_id=0, flow_target_m3s=20.0), confidence=0.99)
    v = run(decision, deterministic_confidence=0.60)
    assert v.status == "needs_human"
    assert "R1 confidence 0.60 < 0.80" in v.reasons[0]


def test_f1_agreement_passes_when_both_confident() -> None:
    """F1: When both LLM and deterministic confidence >= threshold, action is approved."""
    decision = decide(ModulateIntake(gate_id=0, flow_target_m3s=20.0), confidence=0.95)
    v = run(decision, deterministic_confidence=0.90)
    assert v.status == "approved"


def test_unhandled_action_type_fails_closed() -> None:
    """Check that any unexpected action type falls into case _ and fails closed."""

    @dataclass(frozen=True)
    class FakeUnsupportedAction:
        tool: str = "unsupported_tool"

    with pytest.raises(_Reject, match="no safety rule for FakeUnsupportedAction"):
        _check(FakeUnsupportedAction(), make_twin(), LIM, [])  # type: ignore[arg-type]


_actions = st.one_of(
    st.builds(ModulateIntake, gate_id=st.integers(0, 2), flow_target_m3s=st.floats(0, 40)),
    st.builds(TriggerFlush, basin_id=st.integers(0, 2), duration_mins=st.integers(1, 120)),
    st.builds(
        ReallocateDispatch,
        mw_target=st.floats(0, 80),
        feeder_priority=st.permutations(["hospital", "water_pump", "school"]).map(tuple),
    ),
)
_decisions = st.builds(
    AgentDecision,
    actions=st.lists(_actions, max_size=4).map(tuple),
    rationale=st.just("prop"),
    confidence=st.floats(0, 1),
)


@settings(max_examples=300, deadline=None)
@given(_decisions, st.floats(0, 70), st.lists(st.floats(0, 1000), max_size=5).map(sorted).map(tuple))
def test_property_approved_actions_always_within_bounds(d, mw, ts) -> None:  # type: ignore[no-untyped-def]
    twin = make_twin(available_mw=mw)
    v = validate(d, SafetyContext(twin, ts, 1000.0), LIM)
    assert (v.status == "approved") == bool(v.approved_actions)
    if v.status != "approved":
        assert not v.approved_actions
        return
    assert len(v.approved_actions) == len(d.actions) <= LIM.max_actions
    for a in v.approved_actions:
        if isinstance(a, ModulateIntake):
            assert 0 <= a.flow_target_m3s <= twin.gates[a.gate_id].design_flow_m3s
            assert a.flow_target_m3s >= twin.gates[a.gate_id].flow_m3s * (1 - LIM.max_reduction) - 1e-9
        elif isinstance(a, TriggerFlush):
            assert LIM.flush_mins[0] <= a.duration_mins <= LIM.flush_mins[1]
        else:
            assert a.mw_target <= twin.available_mw
