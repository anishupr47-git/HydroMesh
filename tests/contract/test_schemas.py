import pytest
from pydantic import ValidationError

from hydromesh.schemas import (
    AgentDecision,
    AgentEvent,
    Incident,
    ModulateIntake,
    ReallocateDispatch,
    SimilarIncident,
    SOPMatch,
    Telemetry,
    TriggerFlush,
)
from tests.factories import T0, decide, make_twin


def telemetry(**over: object) -> Telemetry:
    base = {"ts": T0, "discharge_m3s": 340.0, "silt_ppm": 300.0, "vibration_mm_s": 1.2, "grid_freq_hz": 50.0}
    return Telemetry(**{**base, **over})


def test_json_round_trip_preserves_equality_and_union_types() -> None:
    d = decide(
        ModulateIntake(gate_id=0, flow_target_m3s=15.0),
        TriggerFlush(basin_id=1, duration_mins=30),
        ReallocateDispatch(mw_target=40.0, feeder_priority=("hospital", "school")),
    )
    again = AgentDecision.model_validate_json(d.model_dump_json())
    assert again == d
    assert [type(a) for a in again.actions] == [ModulateIntake, TriggerFlush, ReallocateDispatch]


def test_snapshot_round_trip() -> None:
    snap = make_twin()
    assert type(snap).model_validate_json(snap.model_dump_json()) == snap


def test_dispatch_must_stay_advisory() -> None:
    with pytest.raises(ValidationError):
        ReallocateDispatch(mw_target=1.0, feeder_priority=("hospital",), advisory=False)


@pytest.mark.parametrize(
    "bad",
    [
        {"discharge_m3s": float("nan")},
        {"silt_ppm": float("inf")},
        {"silt_ppm": -1.0},
        {"grid_freq_hz": 60.0},
        {"unexpected": 1},
    ],
)
def test_telemetry_rejects_unsafe_values(bad: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        telemetry(**bad)


def test_naive_datetime_rejected() -> None:
    with pytest.raises(ValidationError):
        telemetry(ts=T0.replace(tzinfo=None))


def test_models_are_frozen() -> None:
    with pytest.raises(ValidationError):
        telemetry().silt_ppm = 5.0  # type: ignore[misc]


def test_unknown_tool_and_oversized_decision_rejected() -> None:
    payload = '{"actions":[{"tool":"open_all_gates"}],"rationale":"x","confidence":0.9}'
    with pytest.raises(ValidationError):
        AgentDecision.model_validate_json(payload)
    with pytest.raises(ValidationError):
        decide(*[TriggerFlush(basin_id=0, duration_mins=5)] * 5)


# --- Security Finding F2 Contract Tests ------------------------------------------------
def test_f2_string_and_collection_max_length_bounds() -> None:
    """F2: Verify that strings and collections exceeding strict bounds raise ValidationError."""
    with pytest.raises(ValidationError, match=r"(too_long|at most)"):
        SOPMatch(doc_id="sop1", section="sec", text="A" * 2001, score=0.9)

    with pytest.raises(ValidationError, match=r"(too_long|at most)"):
        SimilarIncident(
            incident_id="inc1",
            summary="A" * 1001,
            action="action",
            outcome="protected",
            score=0.9,
        )

    with pytest.raises(ValidationError, match=r"(too_long|at most)"):
        AgentDecision(actions=(), rationale="A" * 601, confidence=0.9)

    with pytest.raises(ValidationError, match=r"(too_long|at most)"):
        ReallocateDispatch(
            mw_target=10.0,
            feeder_priority=tuple(f"feeder_{i}" for i in range(17)),
        )


def test_f2_incident_id_regex_and_path_traversal_rejected() -> None:
    """F2: Identifier pattern ^[A-Za-z0-9_-]{1,64}$ rejects path traversal and special characters."""
    valid = Incident(id="inc_2026-07_001", opened_at=T0)
    assert valid.id == "inc_2026-07_001"

    invalid_ids = [
        "../../etc/passwd",
        "inc/01",
        "inc 01",
        "inc#1",
        "../traversal",
        "",
        "A" * 65,
    ]
    for bad_id in invalid_ids:
        with pytest.raises(ValidationError):
            Incident(id=bad_id, opened_at=T0)


def test_f2_control_characters_rejected() -> None:
    """F2: String fields reject raw control characters (null bytes, ANSI escape codes)."""
    with pytest.raises(ValidationError):
        AgentDecision(actions=(), rationale="Dangerous\x00null_byte", confidence=0.9)

    with pytest.raises(ValidationError):
        SOPMatch(doc_id="sop1", section="sec", text="Bad\x1b[31mescape", score=0.9)


def test_f2_agent_event_payload_caps_and_rejects_nested_blobs() -> None:
    """F2: AgentEvent payload rejects nested structures and enforces scalar types and size caps."""
    # Valid scalar payload
    ev = AgentEvent(
        ts=T0,
        agent="triage",
        kind="info",
        message="ok",
        payload={"str_key": "val", "int_key": 42, "float_key": 3.14, "bool_key": True, "none_key": None},
    )
    assert ev.payload["int_key"] == 42

    # Reject nested dictionary
    with pytest.raises(ValidationError):
        AgentEvent(
            ts=T0,
            agent="triage",
            kind="info",
            message="ok",
            payload={"nested": {"nested_key": "nested_val"}},
        )

    # Reject payload with >32 keys
    oversized_payload = {f"k_{i}": i for i in range(33)}
    with pytest.raises(ValidationError):
        AgentEvent(
            ts=T0,
            agent="triage",
            kind="info",
            message="ok",
            payload=oversized_payload,
        )

    # Reject string scalar > 512 chars in payload
    with pytest.raises(ValidationError):
        AgentEvent(
            ts=T0,
            agent="triage",
            kind="info",
            message="ok",
            payload={"long_val": "X" * 513},
        )
