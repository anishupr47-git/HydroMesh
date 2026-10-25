"""Standard Operating Procedure Retrieval Agent (Vector-Indexed SOP RAG).

Overview:
    Retrieves authoritative plant standard operating procedures (SOPs) and historical incident
    records matching real-time river conditions to guide operational decisions.

Key Capabilities:
    1. Contextual Procedure Retrieval: Instantly identifies applicable operating manual chapters
       (e.g., desander flushing, emergency shutoffs) based on live sediment concentration and flow rate.
    2. Cryptographically Verified Documents: Only queries SOP documentation whose SHA-256 integrity
       hashes match authorized engineering standards.
    3. Historical Incident Precedents: Cross-references current telemetry against past high-flow events
       to recall proven operational responses and historical outcomes.
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
