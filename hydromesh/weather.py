"""Himalayan Satellite Weather Client.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as our mountain weather satellite scout.
1. Looking at the Sky: It asks weather satellites how hard it is raining on top
   of Nepal's highest mountain peaks.
2. Cloud Radar: It checks temperature and cloud cover right above each dam.
3. 48-Hour Peeking: It downloads the hourly rain forecast for the next 2 days.
4. Safety Net (Circuit Breaker): If the internet ever drops in a storm, it never
   crashes! It safely switches to a known mountain weather estimate so the plant
   is always protected.
"""

from __future__ import annotations

import asyncio
import json
import math
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from hydromesh.logging import get_logger
from hydromesh.schemas import HydroPlantSpec, WeatherObservation

log = get_logger(__name__)

OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"
REGISTRY_PATH = Path("data/nepal_hydropower.json")


def load_nepal_plants(path: Path | str = REGISTRY_PATH) -> tuple[HydroPlantSpec, ...]:
    """Load and validate all 25 landmark Nepal hydropower stations from the registry."""
    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"Nepal hydro registry not found at: {file_path}")
    raw_data = json.loads(file_path.read_text(encoding="utf-8"))
    return tuple(HydroPlantSpec.model_validate(p) for p in raw_data)


def get_plant_by_id(plant_id: str, plants: tuple[HydroPlantSpec, ...] | None = None) -> HydroPlantSpec | None:
    """Find a plant by its unique string identifier."""
    registry = plants if plants is not None else load_nepal_plants()
    for plant in registry:
        if plant.id == plant_id:
            return plant
    return None


class WeatherClient:
    """Resilient async client for live satellite weather with circuit-breaker fallback."""

    def __init__(
        self,
        *,
        timeout_s: float = 5.0,
        client: httpx.AsyncClient | None = None,
        breaker_threshold: int = 3,
        breaker_cooldown_s: float = 30.0,
    ) -> None:
        self._timeout_s = timeout_s
        self._external_client = client
        self._breaker_threshold = breaker_threshold
        self._breaker_cooldown_s = breaker_cooldown_s
        self._fail_count = 0
        self._circuit_open_until = 0.0

    def _allow_network(self) -> bool:
        return time.monotonic() >= self._circuit_open_until

    def _record_success(self) -> None:
        self._fail_count = 0

    def _record_failure(self) -> None:
        self._fail_count += 1
        if self._fail_count >= self._breaker_threshold:
            self._circuit_open_until = time.monotonic() + self._breaker_cooldown_s
            log.warning("weather_circuit_opened", cooldown_s=self._breaker_cooldown_s)

    def _make_fallback_observation(self, lat: float, lon: float) -> WeatherObservation:
        """Deterministic mountain weather profile when satellite network is unavailable."""
        now = datetime.now(UTC)
        # Seasonal baseline: monsoon peak July/Aug (7, 8), moderate Oct (10), dry Dec/Jan
        month = now.month
        monsoon_factor = 1.0 if month in (6, 7, 8, 9) else (0.2 if month in (10, 5) else 0.05)
        base_rain = 5.0 * monsoon_factor
        temp = 12.0 - (lat - 27.0) * 2.0  # altitude/latitude lapse estimate

        # 48-hour smooth diurnal forecast curve
        hourly: list[float] = []
        for h in range(48):
            diurnal = max(0.0, math.sin(math.pi * (h % 24) / 12.0))
            hourly.append(round(base_rain * (0.5 + 0.5 * diurnal), 2))

        return WeatherObservation(
            ts=now,
            latitude=lat,
            longitude=lon,
            precipitation_mm_h=round(base_rain, 2),
            temperature_c=round(temp, 1),
            cloud_cover_pct=round(45.0 * monsoon_factor, 1),
            hourly_precipitation_48h=tuple(hourly),
            is_live=False,
        )

    async def fetch_weather(self, lat: float, lon: float) -> WeatherObservation:
        """Fetch real-time satellite weather for plant coordinates with fail-closed safety."""
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            raise ValueError(f"Coordinates out of bounds: lat={lat}, lon={lon}")

        if not self._allow_network():
            log.info("weather_circuit_skipping_network", lat=lat, lon=lon)
            return self._make_fallback_observation(lat, lon)

        params: dict[str, Any] = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,precipitation,cloud_cover",
            "hourly": "precipitation",
            "forecast_days": 2,
        }

        try:
            async with asyncio.timeout(self._timeout_s):
                if self._external_client:
                    resp = await self._external_client.get(OPEN_METEO_BASE_URL, params=params)
                else:
                    async with httpx.AsyncClient(timeout=self._timeout_s) as ac:
                        resp = await ac.get(OPEN_METEO_BASE_URL, params=params)

                resp.raise_for_status()
                payload = resp.json()

            current = payload.get("current", {})
            hourly = payload.get("hourly", {}).get("precipitation", [])
            obs = WeatherObservation(
                ts=datetime.now(UTC),
                latitude=lat,
                longitude=lon,
                precipitation_mm_h=max(0.0, float(current.get("precipitation", 0.0))),
                temperature_c=float(current.get("temperature_2m", 15.0)),
                cloud_cover_pct=min(100.0, max(0.0, float(current.get("cloud_cover", 0.0)))),
                hourly_precipitation_48h=tuple(max(0.0, float(p)) for p in hourly[:48]),
                is_live=True,
            )
            self._record_success()
            return obs

        except Exception as exc:
            self._record_failure()
            log.warning("weather_fetch_failed_using_fallback", error=str(exc), lat=lat, lon=lon)
            return self._make_fallback_observation(lat, lon)
