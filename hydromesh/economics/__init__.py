"""Operational Economics and Energy Revenue Outlook Module.

Overview:
    Connects physical river hydrology and IEC 62364 turbine runner erosion models
    to commercial balance sheet metrics and feed-in tariff revenues.

Core Capabilities:
    1. Generation Revenue Modeling: Forecasts clean energy generation (MWh) and contract revenue (NPR)
       across customizable forward horizons (24 hours to 7 days).
    2. Erosion vs. Curtailment Optimization: Analyzes the economic trade-off between turbine erosion repair
       costs and the revenue forfeited by throttling intake gates during high-silt events.
    3. Read-Only Air-Gap Isolation: Pure mathematical evaluation without physical actuator access.
"""

from __future__ import annotations

from hydromesh.economics.math import compute_deterministic_financial_metrics

__all__ = ["compute_deterministic_financial_metrics"]
