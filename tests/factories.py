"""Tiny builders so tests state only what they care about."""

from __future__ import annotations

from datetime import UTC, datetime

from hydromesh.schemas import AgentDecision, BasinState, GateState, TwinSnapshot

T0 = datetime(2026, 1, 1, tzinfo=UTC)


def make_twin(**over: object) -> TwinSnapshot:
    base: dict[str, object] = {
        "ts": T0,
        "gates": {i: GateState(gate_id=i, flow_m3s=30.0, design_flow_m3s=30.0) for i in (0, 1)},
        "basins": {
            i: BasinState(basin_id=i, sediment_level=0.5, flushing=False, last_flush_age_mins=None) for i in (0, 1)
        },
        "available_mw": 60.0,
        "critical_feeders": ("hospital", "water_pump"),
        "runner_wear": 0.0,
    }
    return TwinSnapshot(**{**base, **over})


def decide(*actions: object, confidence: float = 0.9) -> AgentDecision:
    return AgentDecision(actions=actions, rationale="test", confidence=confidence)
