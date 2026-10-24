"""Deterministic, fail-closed safety kernel (rules R1-R11).

Pure: no I/O, no clock, no LLM. Every input arrives through `SafetyContext`, so the same
call always gives the same verdict. Cost is O(A + log N) for A <= 4 proposed actions and N
recent actions; the rate limit is a bisect on an ascending timestamp tuple, not a scan.

Hardening (Security Finding F1 & F4):
- F1 (Deterministic Confidence): Effective confidence = min(decision.confidence, ctx.deterministic_confidence).
  If an LLM hallucinates or injects confidence=0.99 but deterministic rule/triage agreement is below threshold,
  effective confidence is clamped to the deterministic floor and forces needs_human.
- F4 (Server-Built Context): SafetyContext requires monotonic server timestamp now_s and action log history
  built exclusively by the server/blackboard, disallowing caller-provided time tampering.

Verdict precedence: any hard violation -> "rejected"; otherwise low confidence or an empty
proposal -> "needs_human"; otherwise "approved" with clamped actions.

R1  confidence below threshold            -> needs_human
R2  unknown gate / basin id               -> rejected
R3  flow cut deeper than max_reduction    -> clamp
R4  flow below minimum baseload           -> clamp (never above the current flow)
R5  target above design flow              -> rejected
R6  flush duration outside range          -> rejected
R7  basin flushing, or inside cooldown    -> rejected
R8  action rate limit (incl. this batch)  -> rejected
R9  dispatch target above available MW    -> rejected
R10 critical feeders not first            -> rejected
R11 no actions proposed                   -> needs_human
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
