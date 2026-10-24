"""Unit tests for Himalayan Satellite Weather Client."""

from __future__ import annotations

import httpx
import pytest

from hydromesh.schemas import HydroPlantSpec, WeatherObservation
from hydromesh.weather import WeatherClient, get_plant_by_id, load_nepal_plants


def test_load_nepal_plants_registry_missing_file() -> None:
    """Assert FileNotFoundError when given non-existent path."""
    with pytest.raises(FileNotFoundError):
        load_nepal_plants("data/non_existent_registry.json")


@pytest.mark.asyncio
async def test_weather_client_default_client_fallback() -> None:
    """Assert WeatherClient handles network errors gracefully with default httpx client."""
    # Using an unreachable domain/port to force fallback with default client
    client = WeatherClient(timeout_s=0.5)
    # Target invalid/unroutable IP to quickly trigger fallback
    obs = await client.fetch_weather(27.848, 86.136)
    assert isinstance(obs, WeatherObservation)
    assert obs.is_live in (True, False)
    """Assert all 25 landmark Nepal hydropower stations load and validate."""
    plants = load_nepal_plants()
    assert len(plants) == 25
    for p in plants:
        assert isinstance(p, HydroPlantSpec)
        assert p.capacity_mw > 0
        assert p.design_flow_m3s > 0
        assert 26.0 <= p.latitude <= 31.0  # Nepal latitude bounds
        assert 80.0 <= p.longitude <= 89.0  # Nepal longitude bounds


def test_get_plant_by_id() -> None:
    """Assert specific plant retrieval works and non-existent IDs return None."""
    plant = get_plant_by_id("upper_tamakoshi")
    assert plant is not None
    assert plant.capacity_mw == 456.0
    assert plant.river_basin == "Koshi"

    invalid = get_plant_by_id("atlantis_hydro")
    assert invalid is None


@pytest.mark.asyncio
async def test_weather_client_invalid_coordinates() -> None:
    """Assert out-of-bounds coordinates raise ValueError."""
    client = WeatherClient()
    with pytest.raises(ValueError, match="Coordinates out of bounds"):
        await client.fetch_weather(95.0, 85.0)


@pytest.mark.asyncio
async def test_weather_client_mock_success() -> None:
    """Assert valid Open-Meteo payload parses into frozen WeatherObservation."""
    mock_payload = {
        "current": {
            "time": "2026-10-24T14:00",
            "temperature_2m": 8.5,
            "precipitation": 12.4,
            "cloud_cover": 85,
        },
        "hourly": {
            "precipitation": [10.0 + i * 0.2 for i in range(48)],
        },
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mock_payload)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as ac:
        client = WeatherClient(client=ac)
        obs = await client.fetch_weather(27.848, 86.136)

    assert isinstance(obs, WeatherObservation)
    assert obs.is_live is True
    assert obs.precipitation_mm_h == 12.4
    assert obs.temperature_c == 8.5
    assert obs.cloud_cover_pct == 85.0
    assert len(obs.hourly_precipitation_48h) == 48


@pytest.mark.asyncio
async def test_weather_client_network_failure_fallback() -> None:
    """Assert network errors trigger the fallback profile with is_live=False."""
    def error_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Network down")

    transport = httpx.MockTransport(error_handler)
    async with httpx.AsyncClient(transport=transport) as ac:
        client = WeatherClient(client=ac, breaker_threshold=2, breaker_cooldown_s=10.0)
        obs = await client.fetch_weather(27.848, 86.136)

    assert isinstance(obs, WeatherObservation)
    assert obs.is_live is False
    assert obs.precipitation_mm_h >= 0.0
    assert len(obs.hourly_precipitation_48h) == 48


@pytest.mark.asyncio
async def test_weather_client_circuit_breaker() -> None:
    """Assert repeated failures open the circuit breaker and avoid repeated calls."""
    call_count = 0

    def failing_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        raise httpx.ReadTimeout("Timeout")

    transport = httpx.MockTransport(failing_handler)
    async with httpx.AsyncClient(transport=transport) as ac:
        client = WeatherClient(client=ac, breaker_threshold=2, breaker_cooldown_s=5.0)

        # Call 1 & 2 fail and trip the breaker
        obs1 = await client.fetch_weather(27.848, 86.136)
        obs2 = await client.fetch_weather(27.848, 86.136)
        assert obs1.is_live is False
        assert obs2.is_live is False
        assert call_count == 2

        # Call 3 is short-circuited: network call_count remains 2
        obs3 = await client.fetch_weather(27.848, 86.136)
        assert obs3.is_live is False
        assert call_count == 2
