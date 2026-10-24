import structlog

from hydromesh.logging import configure_logging, get_logger, incident_scope, redact_sensitive_data


def test_incident_id_is_bound_inside_scope_and_restored_after() -> None:
    configure_logging(env="prod", level="DEBUG")
    log = get_logger("test")
    assert log is not None
    with incident_scope("47"):
        assert structlog.contextvars.get_contextvars()["incident_id"] == "47"
        with incident_scope("48"):
            assert structlog.contextvars.get_contextvars()["incident_id"] == "48"
        assert structlog.contextvars.get_contextvars()["incident_id"] == "47"
    assert "incident_id" not in structlog.contextvars.get_contextvars()


def test_f6_redaction_masks_sensitive_keys() -> None:
    """F6 regression test: asserting fake token 'sk-live-test12345' and secrets are redacted."""
    event = {
        "event": "auth_event",
        "token": "sk-live-test12345",
        "api_key": "secret-12345",
        "password": "supersecretpassword",
        "authorization": "Bearer eyJhbGciOi...",
        "user_secret": "my-secret-val",
        "safe_param": "regular_value",
    }
    redacted = redact_sensitive_data(None, "info", event)
    assert redacted["token"] == "[REDACTED]"
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["password"] == "[REDACTED]"
    assert redacted["authorization"] == "[REDACTED]"
    assert redacted["user_secret"] == "[REDACTED]"
    assert redacted["safe_param"] == "regular_value"


def test_f6_redaction_sanitizes_crlf_and_truncates_oversized() -> None:
    """F6 regression test: sanitize CR/LF to prevent log injection and truncate oversized fields."""
    injected_str = "line1\r\nADMIN_OVERRIDE\nline2\rline3"
    oversized_str = "A" * 600
    event = {
        "event": "test_sanitization",
        "injected": injected_str,
        "oversized": oversized_str,
    }
    redacted = redact_sensitive_data(None, "info", event)
    assert "\r" not in redacted["injected"]
    assert "\n" not in redacted["injected"]
    assert "\\r\\nADMIN_OVERRIDE\\nline2\\rline3" in redacted["injected"]
    assert len(redacted["oversized"]) <= 512 + len("...[TRUNCATED]")
    assert redacted["oversized"].endswith("...[TRUNCATED]")
