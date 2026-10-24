"""Security Verification: Finding F1 - Deterministic Confidence Anchor.

Threat:
  An adversarial prompt injection or hallucinating LLM self-reports confidence=0.99
  to bypass human review in safety rule R1.

Architectural Defense:
  Effective confidence is strictly computed as min(decision.confidence, ctx.deterministic_confidence).
  If deterministic triage/rule agreement is < min_confidence (0.80), the kernel produces needs_human.
"""

from __future__ import annotations

import pytest

from hydromesh.safety import DEFAULT_LIMITS, SafetyContext, validate
from hydromesh.schemas import AgentDecision, ModulateIntake
from tests.factories import decide, make_twin


def test_adversarial_inflated_confidence_fails_closed() -> None:
    """Attacker injected prompt reports 0.99 confidence on 0.50 deterministic confidence."""
    twin = make_twin()
    decision = decide(ModulateIntake(gate_id=0, flow_target_m3s=20.0), confidence=0.99)
    ctx = SafetyContext(twin=twin, recent_action_ts=(), now_s=1000.0, deterministic_confidence=0.50)

    verdict = validate(decision, ctx, DEFAULT_LIMITS)
    assert verdict.status == "needs_human"
    assert "R1 confidence 0.50 < 0.80" in verdict.reasons[0]
    assert not verdict.approved_actions


@pytest.mark.parametrize("det_conf", [0.0, 0.25, 0.50, 0.75, 0.79])
def test_any_deterministic_confidence_below_threshold_forces_human(det_conf: float) -> None:
    """Regardless of LLM self-confidence (even 1.0), low deterministic confidence requires a human."""
    twin = make_twin()
    decision = AgentDecision(
        actions=(ModulateIntake(gate_id=0, flow_target_m3s=25.0),),
        rationale="Adversarial claim of absolute certainty",
        confidence=1.0,
    )
    ctx = SafetyContext(twin=twin, recent_action_ts=(), now_s=1000.0, deterministic_confidence=det_conf)

    verdict = validate(decision, ctx, DEFAULT_LIMITS)
    assert verdict.status == "needs_human"
    assert "R1" in verdict.reasons[0]


def test_hard_safety_violations_preempt_confidence() -> None:
    """Even if deterministic confidence is 1.0, a hard rule violation (e.g. unknown gate) is rejected."""
    twin = make_twin()
    decision = decide(ModulateIntake(gate_id=99, flow_target_m3s=20.0), confidence=0.99)
    ctx = SafetyContext(twin=twin, recent_action_ts=(), now_s=1000.0, deterministic_confidence=1.0)

    verdict = validate(decision, ctx, DEFAULT_LIMITS)
    assert verdict.status == "rejected"
    assert "R2" in verdict.reasons[0]
