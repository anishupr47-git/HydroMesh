"""LLM client integration with Ollama and deterministic test fake."""

from __future__ import annotations


class OllamaClient:
    """Ollama client with schema-constrained JSON generation placeholder."""

    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "qwen2.5:7b-instruct",
    ) -> None:
        self.host = host
        self.model = model


class FakeLLM:
    """Deterministic fake LLM client for tests."""

    def __init__(self, canned_response: str = "{}") -> None:
        self.canned_response = canned_response
