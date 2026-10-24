"""The Book Reader Agent (SOP RAG).

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this agent as the Control Room Librarian holding the official Plant Rulebook.
1. Instant Rule Finder: When muddy water starts climbing, it flips directly
   to the exact chapter of the high-sediment operating manual.
2. Verified Rules Only: It only reads official procedures that passed the security
   fingerprint check.
3. Historical Lessons: It pulls up past river incidents so the dispatcher knows
   what worked best in previous floods.
"""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent
from hydromesh.memory import SOPMemory
from hydromesh.schemas import AnomalyVector, SimilarIncident, SOPMatch, Telemetry


class SOPRAGAgent(BaseAgent):
    """Retrieval-Augmented Generation agent matching plant conditions against verified SOPs."""

    def __init__(self, memory: SOPMemory | None = None) -> None:
        super().__init__(name="SOPLibrarian", role="Operating Procedure & Incident Retrieval")
        self.memory = memory or SOPMemory()

    async def run(
        self,
        telemetry: Telemetry,
        anomaly: AnomalyVector,
        query: str | None = None,
    ) -> tuple[tuple[SOPMatch, ...], tuple[SimilarIncident, ...]]:
        """Retrieve applicable SOP rules and past incidents matching current plant telemetry."""
        search_query = query or (
            f"silt {telemetry.silt_ppm:.0f} ppm severity {anomaly.severity.value} "
            f"discharge {telemetry.discharge_m3s:.0f} desander flushing protocol"
        )

        matches = self.memory.search_sops(search_query, min_score=0.20, limit=3)
        incidents = self.memory.search_similar_incidents(search_query, limit=2)
        return matches, incidents
