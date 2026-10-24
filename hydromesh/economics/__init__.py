"""HydroMesh Operational Economics & Revenue Outlook Module.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this module as the Dam's Financial Calculator & Cash Register.
1. Clean Power Earnings: Calculates how many Megawatt-hours (MWh) of electricity
   the river water can produce over the next 24 hours to 7 days, and multiplies by
   the official PPA electricity tariff (NPR per kWh).
2. Sand Wear vs. Money Trade-off: When mountain rivers carry sharp sand, running water
   scratches the turbine blades (IEC 62364 standard). This module calculates whether
   it is smarter to briefly throttle intake water to save millions of Rupees in turbine repairs!
3. Strict Air-Gap Guard: This module is read-only. It cannot move any water gates or valves.
"""

from __future__ import annotations

from hydromesh.economics.math import compute_deterministic_financial_metrics

__all__ = ["compute_deterministic_financial_metrics"]
