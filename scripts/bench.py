"""Micro-benchmarks for safety.validate, PlantTwin.step, and 24h simulation.

Measures latency vs production budgets without adding dependencies.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import time

from hydromesh.safety import DEFAULT_LIMITS, SafetyContext, validate
from hydromesh.schemas import ModulateIntake
from hydromesh.twin.plant import PlantTwin
from hydromesh.twin.scenarios import normal
from tests.factories import decide, make_twin


def bench_validate(iterations: int = 10_000) -> float:
    twin = make_twin()
    d = decide(ModulateIntake(gate_id=0, flow_target_m3s=20.0), confidence=0.9)
    ctx = SafetyContext(twin=twin, recent_action_ts=(10.0, 20.0), now_s=100.0)

    # Warmup
    for _ in range(100):
        validate(d, ctx, DEFAULT_LIMITS)

    t0 = time.perf_counter()
    for _ in range(iterations):
        validate(d, ctx, DEFAULT_LIMITS)
    elapsed = time.perf_counter() - t0
    us_per_call = (elapsed / iterations) * 1e6
    return us_per_call


def bench_step(iterations: int = 10_000) -> float:
    twin = PlantTwin(normal, seed=42)

    # Warmup
    for _ in range(100):
        twin.step(10.0)

    t0 = time.perf_counter()
    for _ in range(iterations):
        twin.step(10.0)
    elapsed = time.perf_counter() - t0
    us_per_step = (elapsed / iterations) * 1e6
    return us_per_step


def bench_24h_simulation() -> float:
    dt = 10.0
    steps = int(86_400.0 / dt)  # 8,640 steps
    twin = PlantTwin(normal, seed=42)

    t0 = time.perf_counter()
    for _ in range(steps):
        twin.step(dt)
    ms_total = (time.perf_counter() - t0) * 1e3
    return ms_total


def main() -> None:
    print("=" * 60)
    print("HydroMesh Engine Micro-Benchmarks (Production Baseline)")
    print("=" * 60)

    val_us = bench_validate()
    status_val = "PASS" if val_us < 50.0 else "WARN"
    print(f"safety.validate:     {val_us:6.2f} us / call   (budget: < 50.0 us)   [{status_val}]")

    step_us = bench_step()
    status_step = "PASS" if step_us < 10.0 else "WARN"
    print(f"PlantTwin.step:      {step_us:6.2f} us / step   (budget: < 10.0 us)   [{status_step}]")

    sim_ms = bench_24h_simulation()
    status_sim = "PASS" if sim_ms < 50.0 else "WARN"
    print(f"24h Simulation:      {sim_ms:6.2f} ms / run    (budget: < 50.0 ms)   [{status_sim}]")
    print("=" * 60)


if __name__ == "__main__":
    main()
