"""Security Verification: Finding F6 - Log Redaction & Injection Defense.

Threat:
  Sensitive credentials land in logs, or unsanitized strings inject fake log events (CWE-117).

Architectural Defense:
  Structlog redaction processor masks sensitive keys and escapes CR/LF characters.
"""

from __future__ import annotations

from hydromesh.logging import redact_sensitive_data


def test_f6_credential_masking() -> None:
    event = {
        "event": "operator_login",
        "token": "sk-live-test12345",
        "api_key": "prod-secret-9999",
        "password": "plant-admin-password",
        "authorization": "Bearer eyJhbGci...",
        "secret": "top-secret-salt",
    }
    redacted = redact_sensitive_data(None, "info", event)
    for key in ("token", "api_key", "password", "authorization", "secret"):
        assert redacted[key] == "[REDACTED]"


def test_f6_crlf_log_injection_stripped() -> None:
    event = {
        "event": "telemetry_ingest",
        "payload": "normal_val\r\n[CRITICAL] 2026-10-24 GATE_OVERRIDE_APPROVED\r\n",
    }
    redacted = redact_sensitive_data(None, "info", event)
    assert "\r" not in redacted["payload"]
    assert "\n" not in redacted["payload"]
    assert "\\r\\n[CRITICAL]" in redacted["payload"]


def test_f6_oversized_value_truncated() -> None:
    event = {
        "event": "sop_chunk",
        "text": "X" * 1000,
    }
    redacted = redact_sensitive_data(None, "info", event)
    assert len(redacted["text"]) <= 512 + len("...[TRUNCATED]")
    assert redacted["text"].endswith("...[TRUNCATED]")
