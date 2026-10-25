"""Hydropower Safety Verification Engine (Rules R1–R11).

Overview:
    HydroMesh enforces a hard deterministic safety envelope over all AI decisions.
    Machine learning models generate recommendations, but cannot act directly on physical
    plant hardware. Every proposed action is mathematically validated against physical dam
    limits, hydraulic pressure thresholds, and environmental standards before execution.

Core Safety Principles:
    1. Human-in-the-Loop Oversight: If model confidence falls below 80% or if no actions are
       proposed during high risk, control immediately defaults to human operators (R1, R11).
    2. Physical Boundary Verification: Gate identifiers and desanding basins must exist in the
       physical plant specification (R2). Flow cannot exceed designed intake limits (R5).
    3. Water Hammer & Environmental Protection: Intake flow cannot drop more than 50% in a
       single step to prevent pipe water hammer (R3), and minimum ecological river flow (20%)
       is permanently preserved for downstream habitats (R4).
    4. Actuator Longevity: Desanding flush cycles are bounded between 5 and 90 minutes (R6)
       with mandatory 60-minute rest intervals (R7) and a maximum of 3 commands per 10 minutes
       to prevent mechanical motor fatigue (R8).
    5. Grid & Critical Feeder Priority: Power output cannot exceed instantaneous hydraulic
       generation limits (R9), and critical civic feeders (hospitals, water pumps) receive
       unconditional grid priority during load shedding (R10).

Invariants & Execution Guarantees:
    - Pure Determinism: Zero network I/O, zero clock dependencies, zero probabilistic drift.
    - Defense-in-Depth: Effective confidence is bounded by min(model_confidence, deterministic_confidence).
    - Tamper Resistance: All physical evaluation contexts are constructed on the secure server.
"""

from __future__ import annotations

from bisect import bisect_left
from dataclasses import dataclass

from hydromesh.schemas import (
    Action,
    AgentDecision,
    ModulateIntake,
    ReallocateDispatch,
    SafetyVerdict,
    TriggerFlush,
    TwinSnapshot,
    VerdictStatus,
)


@dataclass(frozen=True, slots=True)
class SafetyLimits:
    min_confidence: float = 0.80
    max_reduction: float = 0.50  # fraction of current gate flow that may be cut at once
    min_baseload: float = 0.20  # fraction of design flow always kept alive
    flush_mins: tuple[int, int] = (5, 90)
    flush_cooldown_mins: float = 60.0
    max_actions: int = 3  # per `window_s`
    window_s: float = 600.0


@dataclass(frozen=True, slots=True)
class SafetyContext:
    twin: TwinSnapshot
    recent_action_ts: tuple[float, ...]  # monotonic seconds, ascending
    now_s: float
    deterministic_confidence: float = 1.0  # F1: agreement from deterministic rules/triage (0.0 to 1.0)


DEFAULT_LIMITS = SafetyLimits()


class _Reject(Exception):
    """Internal control flow only: aborts validation of the whole decision."""


def _check(action: Action, twin: TwinSnapshot, lim: SafetyLimits, notes: list[str]) -> Action:
    """Return the action (possibly clamped) or raise `_Reject` with the violated rule."""
    match action:
        case ModulateIntake(gate_id=gid, flow_target_m3s=target):
            gate = twin.gates.get(gid)
            if gate is None:
                raise _Reject(f"R2 unknown gate {gid}")
            if target > gate.design_flow_m3s:
                raise _Reject(f"R5 gate {gid} target {target:.1f} > design {gate.design_flow_m3s:.1f} m3/s")
            # Clamp floor never exceeds the current flow, so a "cut" can never become a raise.
            floor = min(
                gate.flow_m3s,
                max(gate.flow_m3s * (1.0 - lim.max_reduction), gate.design_flow_m3s * lim.min_baseload),
            )
            if target < floor:
                notes.append(f"R3/R4 gate {gid} clamped {target:.1f}->{floor:.1f} m3/s")
                return action.model_copy(update={"flow_target_m3s": floor})
            return action
        case TriggerFlush(basin_id=bid, duration_mins=mins):
            basin = twin.basins.get(bid)
            if basin is None:
                raise _Reject(f"R2 unknown basin {bid}")
            lo, hi = lim.flush_mins
            if not lo <= mins <= hi:
                raise _Reject(f"R6 flush {mins} min outside [{lo}, {hi}]")
            if basin.flushing:
                raise _Reject(f"R7 basin {bid} already flushing")
            age = basin.last_flush_age_mins
            if age is not None and age < lim.flush_cooldown_mins:
                raise _Reject(f"R7 basin {bid} flushed {age:.0f} min ago (cooldown {lim.flush_cooldown_mins:.0f})")
            return action
        case ReallocateDispatch(mw_target=mw, feeder_priority=feeders):
            if mw > twin.available_mw:
                raise _Reject(f"R9 target {mw:.1f} MW > available {twin.available_mw:.1f} MW")
            n = len(twin.critical_feeders)
            if len(feeders) < n or set(feeders[:n]) != set(twin.critical_feeders):
                raise _Reject("R10 critical feeders must lead the priority list")
            return action
        case _:  # the union is closed; fail closed if it ever grows without a rule
            raise _Reject(f"no safety rule for {type(action).__name__}")


def _verdict(status: VerdictStatus, *reasons: str, approved: tuple[Action, ...] = ()) -> SafetyVerdict:
    return SafetyVerdict(status=status, reasons=reasons, approved_actions=approved)


def validate(decision: AgentDecision, ctx: SafetyContext, limits: SafetyLimits = DEFAULT_LIMITS) -> SafetyVerdict:
    """Gate every actuator call. Nothing the LLM proposes executes without passing through here."""
    if not decision.actions:
        return _verdict("needs_human", "R11 no actions proposed")

    recent = len(ctx.recent_action_ts) - bisect_left(ctx.recent_action_ts, ctx.now_s - limits.window_s)
    if recent + len(decision.actions) > limits.max_actions:
        return _verdict("rejected", f"R8 {recent} recent + {len(decision.actions)} proposed > {limits.max_actions}")

    notes: list[str] = []
    try:
        approved = tuple(_check(a, ctx.twin, limits, notes) for a in decision.actions)
    except _Reject as rule:
        return _verdict("rejected", str(rule))

    # F1: Effective confidence is min of LLM self-reported confidence and deterministic confidence
    effective_confidence = min(decision.confidence, ctx.deterministic_confidence)
    if effective_confidence < limits.min_confidence:
        return _verdict(
            "needs_human",
            f"R1 confidence {effective_confidence:.2f} < {limits.min_confidence:.2f}",
            *notes,
        )
    return _verdict("approved", *notes, approved=approved)
