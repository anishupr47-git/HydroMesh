"""Security Verification: Finding F5 - Ollama Host Allowlist & SSRF Defense.

Threat:
  Attacker manipulates OllamaConfig.host to target cloud metadata (169.254.169.254),
  internal services, or local file schemes (file://).

Architectural Defense:
  OllamaConfig enforces strict scheme (http/https) and loopback host allowlist at construction.
"""

from __future__ import annotations

import pytest

from hydromesh.llm import OllamaConfig


@pytest.mark.parametrize(
    "forbidden_host",
    [
        "http://169.254.169.254",
        "http://169.254.169.254:80",
        "http://metadata.google.internal",
        "http://instance-data",
        "file:///etc/passwd",
        "file:///C:/Windows/win.ini",
        "gopher://127.0.0.1:11434",
        "ftp://127.0.0.1",
        "http://attacker.com",
        "http://evil.internal.corp",
        "http://10.0.0.1:11434",
        "http://user:password@127.0.0.1:11434",
    ],
)
def test_ssrf_forbidden_hosts_rejected_at_construction(forbidden_host: str) -> None:
    with pytest.raises(ValueError):
        OllamaConfig(host=forbidden_host)


@pytest.mark.parametrize(
    "valid_host",
    [
        "http://localhost:11434",
        "http://127.0.0.1:11434",
        "http://[::1]:11434",
        "https://127.0.0.1:11434",
    ],
)
def test_valid_loopback_hosts_accepted(valid_host: str) -> None:
    cfg = OllamaConfig(host=valid_host)
    assert cfg.host == valid_host
