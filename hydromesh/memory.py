"""Vector memory and incident storage using ChromaDB."""

from __future__ import annotations


class IncidentMemory:
    """ChromaDB vector store wrapper for SOPs and past incidents."""

    def __init__(self, chroma_path: str = ".chroma") -> None:
        self.chroma_path = chroma_path
