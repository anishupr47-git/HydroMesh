"""Hydraulic Digital Twin Simulation Engine.

Overview:
    Simulates real-world hydropower physics—including river inflow, intake sluice gates,
    desanding settling basins, penstock pressure, and turbine abrasion erosion.

Physical Mechanics:
    1. River Inflow & Intake Gates: Models river water entering headworks intake sluices,
       enforcing mechanical travel speed and maximum design discharge limits.
    2. Sediment Settling Basins: Simulates gravity-based settling of heavy quartz sediment particles
       in desanding chambers, calculating bed accumulation and scour flushing dynamics.
    3. Power Generation Physics: Calculates instantaneous electrical generation (MW) from net hydraulic
       head, water flow rate, and generator efficiency.
    4. Turbine Runner Erosion (IEC 62364): Simulates abrasive surface wear caused by suspended quartz
       silt particles striking turbine runner blades at high velocity.
    5. Atomic Safety Verification: Re-validates current plant state against safety rules immediately
       before applying gate modulation commands to prevent time-of-check to time-of-use (TOCTOU) race conditions.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from hydromesh.safety import SafetyContext, SafetyLimits, validate
from hydromesh.schemas import (
    Action,
    AgentDecision,
    BasinState,
    GateState,
    ModulateIntake,
    ReallocateDispatch,
    Telemetry,
    TriggerFlush,
    TwinSnapshot,
)
from hydromesh.twin.scenarios import Scenario


@dataclass(frozen=True, slots=True)
class PlantSpec:
    n_units: int = 2  # gate i feeds desander basin i feeds turbine unit i
    design_flow_m3s: float = 30.0  # per unit
    env_flow_m3s: float = 10.0  # must stay in the river
    head_m: float = 120.0
    efficiency: float = 0.90
    gate_tau_s: float = 20.0
    trap_coeff_m3s: float = 45.0  # w*A in eta = 1 - exp(-w*A/Q)
    basin_capacity_kg: float = 4.0e5
    flush_drain_s: float = 1_200.0  # time to empty a full basin
    flush_trap_penalty: float = 0.4  # trapping efficiency multiplier while flushing
    wear_life_days: float = 90.0
    wear_ref_ppm: float = 3_000.0
    wear_exponent: float = 2.5
    vib_base_mm_s: float = 1.2
    vib_wear_gain: float = 6.0
    vib_off_design_gain: float = 3.0
    sensor_noise: float = 0.03
    critical_feeders: tuple[str, ...] = ("hospital", "water_pump", "ward_clinic")
    epoch: datetime = datetime(2026, 1, 1, tzinfo=UTC)

    @property
    def mw_per_m3s(self) -> float:
        return 9.81e-3 * self.efficiency * self.head_m


DEFAULT_SPEC = PlantSpec()


class PlantTwin:
    """Deterministic for a given (scenario, spec, seed, dt sequence)."""

    __slots__ = (
        "_derate", "_flush_left", "_last_flush_end", "_level", "_q", "_rng", "_scenario",
        "_spec", "_t", "_target", "_wear", "_wear_k",
    )  # fmt: skip

    def __init__(self, scenario: Scenario, spec: PlantSpec = DEFAULT_SPEC, seed: int = 42) -> None:
        n = spec.n_units
        self._spec, self._scenario, self._rng = spec, scenario, random.Random(seed)
        self._q = [spec.design_flow_m3s] * n
        self._target = [spec.design_flow_m3s] * n
        self._level = [0.0] * n
        self._flush_left = [0.0] * n
        self._last_flush_end: list[float | None] = [None] * n
        self._wear_k = 1.0 / (spec.wear_life_days * 86_400.0 * spec.wear_ref_ppm)
        self._wear, self._t, self._derate = 0.0, 0.0, 1.0

    def step(self, dt_s: float) -> Telemetry:
        """Advance the plant by `dt_s` seconds and return what the sensors would report."""
        sp, n = self._spec, self._spec.n_units
        inp = self._scenario(self._t)
        c_in = inp.silt_ppm
        self._derate = inp.derate

        # A shared intake cannot divert more than the river provides above the env. flow.
        want = sum(self._target)
        available = max(0.0, inp.q_river_m3s - sp.env_flow_m3s)
        scale = min(1.0, available / want) if want > 0.0 else 1.0
        alpha = -math.expm1(-dt_s / sp.gate_tau_s)

        wear_load = q_total = 0.0
        for i in range(n):
            q = self._q[i] + (self._target[i] * scale - self._q[i]) * alpha
            self._q[i] = q
            eta = -math.expm1(-sp.trap_coeff_m3s / max(q, 1e-6)) * (1.0 - self._level[i])
            level, left = self._level[i], self._flush_left[i]
            if left > 0.0:
                eta *= sp.flush_trap_penalty
                level = max(0.0, level - dt_s / sp.flush_drain_s)
                left = max(0.0, left - dt_s)
                self._flush_left[i] = left
                if left == 0.0:
                    self._last_flush_end[i] = self._t + dt_s
            # 1 ppm ~ 1e-3 kg/m3, so trapped mass rate [kg/s] = c * 1e-3 * eta * q
            self._level[i] = min(1.0, level + c_in * 1e-3 * eta * q * dt_s / sp.basin_capacity_kg)
            wear_load += c_in * (1.0 - eta) * (q / sp.design_flow_m3s) ** sp.wear_exponent
            q_total += q

        self._wear = min(1.0, self._wear + self._wear_k * (wear_load / n) * dt_s)
        self._t += dt_s

        off_design = q_total / (n * sp.design_flow_m3s) - 1.0
        vibration = sp.vib_base_mm_s + sp.vib_wear_gain * self._wear + sp.vib_off_design_gain * off_design**2
        noisy_silt = max(0.0, c_in * (1.0 + sp.sensor_noise * self._rng.gauss(0.0, 1.0)))
        return Telemetry(
            ts=sp.epoch + timedelta(seconds=self._t),
            discharge_m3s=inp.q_river_m3s,
            silt_ppm=noisy_silt,
            vibration_mm_s=vibration,
            grid_freq_hz=inp.freq_hz,
            rainfall_mm_h=inp.rainfall_mm_h,
        )

    def apply(
        self,
        action: Action | AgentDecision | tuple[Action, ...] | list[Action],
        *,
        limits: SafetyLimits | None = None,
        context_history: tuple[float, ...] = (),
    ) -> bool:
        """Execute action(s) with Security F3 atomic re-validation against fresh plant snapshot."""
        if isinstance(action, AgentDecision):
            decision = action
        elif isinstance(action, (list, tuple)):
            decision = AgentDecision(actions=tuple(action), rationale="atomic apply", confidence=1.0)
        else:
            decision = AgentDecision(actions=(action,), rationale="atomic apply", confidence=1.0)

        effective_limits = limits or SafetyLimits(max_reduction=1.0, min_baseload=0.0)
        fresh_snap = self.snapshot()
        fresh_ctx = SafetyContext(twin=fresh_snap, recent_action_ts=context_history, now_s=self._t)
        verdict = validate(decision, fresh_ctx, effective_limits)

        if verdict.status != "approved" or not verdict.approved_actions:
            return False

        for app_action in verdict.approved_actions:
            self._apply_one(app_action)
        return True

    def _apply_one(self, action: Action) -> None:
        match action:
            case ModulateIntake(gate_id=gid, flow_target_m3s=target):
                self._target[gid] = min(target, self._spec.design_flow_m3s)
            case TriggerFlush(basin_id=bid, duration_mins=mins):
                if self._flush_left[bid] == 0.0:  # a running flush is never restarted
                    self._flush_left[bid] = mins * 60.0
            case ReallocateDispatch():
                pass  # advisory only: a recommendation for dispatchers, no plant effect

    def _flush_age_mins(self, i: int) -> float | None:
        end = self._last_flush_end[i]
        return None if end is None else (self._t - end) / 60.0

    def snapshot(self) -> TwinSnapshot:
        sp = self._spec
        return TwinSnapshot(
            ts=sp.epoch + timedelta(seconds=self._t),
            gates={
                i: GateState(gate_id=i, flow_m3s=q, design_flow_m3s=sp.design_flow_m3s) for i, q in enumerate(self._q)
            },
            basins={
                i: BasinState(
                    basin_id=i,
                    sediment_level=self._level[i],
                    flushing=self._flush_left[i] > 0.0,
                    last_flush_age_mins=self._flush_age_mins(i),
                )
                for i in range(sp.n_units)
            },
            available_mw=sum(self._q) * sp.mw_per_m3s * self._derate,
            critical_feeders=sp.critical_feeders,
            runner_wear=self._wear,
        )
