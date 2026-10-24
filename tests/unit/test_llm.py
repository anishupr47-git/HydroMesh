import httpx
import pytest

from hydromesh.errors import LLMOutputError, LLMUnavailable
from hydromesh.llm import FakeLLM, OllamaClient, OllamaConfig, generate_or
from hydromesh.schemas import RoutingPlan

PLAN = RoutingPlan(steps=("triage", "dispatch", "explain"), reason="test")


class _Msg:
    def __init__(self, content: str) -> None:
        self.content = content


class _Resp:
    def __init__(self, content: str) -> None:
        self.message = _Msg(content)


class StubClient:
    """Stands in for ollama.AsyncClient: replays outcomes, counts calls."""

    def __init__(self, *outcomes: object) -> None:
        self._outcomes, self.calls = list(outcomes), 0

    async def chat(self, **_: object) -> _Resp:
        self.calls += 1
        out = self._outcomes.pop(0)
        if isinstance(out, Exception):
            raise out
        return _Resp(str(out))

    async def generate(self, **_: object) -> _Resp:
        self.calls += 1
        if self._outcomes:
            out = self._outcomes.pop(0)
            if isinstance(out, Exception):
                raise out
            return _Resp(str(out))
        return _Resp("ok")


def client(stub: StubClient, now: list[float]) -> OllamaClient:
    return OllamaClient(OllamaConfig(max_retries=1), client=stub, clock=lambda: now[0])  # type: ignore[arg-type]


async def test_valid_json_is_parsed() -> None:
    stub = StubClient(PLAN.model_dump_json())
    assert await client(stub, [0.0]).generate_structured(system="s", user="u", schema=RoutingPlan) == PLAN


async def test_invalid_json_retries_once_then_raises_output_error() -> None:
    stub = StubClient("not json", '{"steps": ["fly"]}')
    with pytest.raises(LLMOutputError):
        await client(stub, [0.0]).generate_structured(system="s", user="u", schema=RoutingPlan)
    assert stub.calls == 2


async def test_breaker_opens_after_two_connection_failures_and_recovers() -> None:
    down = httpx.ConnectError("refused")
    stub, now = StubClient(down, down, PLAN.model_dump_json()), [0.0]
    c = client(stub, now)
    for _ in range(2):
        with pytest.raises(LLMUnavailable):
            await c.generate_structured(system="s", user="u", schema=RoutingPlan)
    with pytest.raises(LLMUnavailable, match="circuit open"):
        await c.generate_structured(system="s", user="u", schema=RoutingPlan)
    assert stub.calls == 2  # the open breaker never touched the backend
    now[0] = 31.0  # cooldown elapsed -> half-open probe succeeds
    assert await c.generate_structured(system="s", user="u", schema=RoutingPlan) == PLAN


async def test_generate_or_uses_llm_then_falls_back() -> None:
    fallback = RoutingPlan(steps=("dispatch", "explain"), reason="fallback")
    good, used = await generate_or(FakeLLM(PLAN), lambda: fallback, system="s", user="u", schema=RoutingPlan)
    assert (good, used) == (PLAN, True)
    for llm in (FakeLLM(LLMUnavailable("down")), FakeLLM(LLMOutputError("bad")), None):
        got, used = await generate_or(llm, lambda: fallback, system="s", user="u", schema=RoutingPlan)
        assert (got, used) == (fallback, False)


async def test_warmup_handles_success_and_failure() -> None:
    stub = StubClient("ok")
    c = client(stub, [0.0])
    await c.warmup()
    assert stub.calls == 1

    down = httpx.ConnectError("warmup failed")
    stub_fail = StubClient(down)
    c_fail = client(stub_fail, [0.0])
    await c_fail.warmup()
    assert stub_fail.calls == 1


def test_fake_llm_mismatched_schema_raises_assertion_error() -> None:
    fake = FakeLLM(PLAN)
    with pytest.raises(AssertionError, match="caller asked for"):
        import asyncio

        from hydromesh.schemas import AgentDecision

        asyncio.run(fake.generate_structured(system="s", user="u", schema=AgentDecision))


# --- Security Finding F5 Regression Tests (SSRF & Host Allowlist) -----------------------
def test_f5_ssrf_cloud_metadata_rejected() -> None:
    """F5: Attempting to connect to AWS/GCP cloud metadata IP 169.254.169.254 raises ValueError."""
    with pytest.raises(ValueError, match="cloud metadata endpoint"):
        OllamaConfig(host="http://169.254.169.254")
    with pytest.raises(ValueError, match="cloud metadata endpoint"):
        OllamaConfig(host="http://169.254.169.254:11434")
    with pytest.raises(ValueError, match="cloud metadata endpoint"):
        OllamaConfig(host="http://metadata.google.internal")


def test_f5_ssrf_non_http_schemes_rejected() -> None:
    """F5: Non-HTTP schemes like file://, gopher://, ftp:// raise ValueError at construction."""
    with pytest.raises(ValueError, match="Invalid scheme"):
        OllamaConfig(host="file:///etc/passwd")
    with pytest.raises(ValueError, match="Invalid scheme"):
        OllamaConfig(host="gopher://127.0.0.1:11434")
    with pytest.raises(ValueError, match="Invalid scheme"):
        OllamaConfig(host="ftp://127.0.0.1")


def test_f5_ssrf_external_hosts_rejected() -> None:
    """F5: External domains or remote attacker IPs raise ValueError at construction."""
    with pytest.raises(ValueError, match="not in the allowed loopback allowlist"):
        OllamaConfig(host="http://attacker.com")
    with pytest.raises(ValueError, match="not in the allowed loopback allowlist"):
        OllamaConfig(host="http://192.168.1.100:11434")
    with pytest.raises(ValueError, match="not in the allowed loopback allowlist"):
        OllamaConfig(host="http://8.8.8.8:11434")
    with pytest.raises(ValueError, match="Missing hostname"):
        OllamaConfig(host="http://")


def test_f5_userinfo_in_host_rejected() -> None:
    """F5: Host URL containing userinfo (user:pass@host) is rejected."""
    with pytest.raises(ValueError, match="Userinfo"):
        OllamaConfig(host="http://user:pass@127.0.0.1:11434")


def test_f5_valid_loopback_hosts_accepted() -> None:
    """F5: Valid loopback endpoints (localhost, 127.0.0.1, IPv6 [::1]) are permitted."""
    cfg1 = OllamaConfig(host="http://localhost:11434")
    assert cfg1.host == "http://localhost:11434"

    cfg2 = OllamaConfig(host="http://127.0.0.1:11434")
    assert cfg2.host == "http://127.0.0.1:11434"

    cfg3 = OllamaConfig(host="http://[::1]:11434")
    assert cfg3.host == "http://[::1]:11434"
