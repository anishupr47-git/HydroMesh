"""FastAPI Application Factory & Security Middleware Stack.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Secure Front Door and Guardhouse of our web service.
1. Security Armor: Adds security headers to keep hackers and spoofers out.
2. Speed Bump (Rate Limiter): Prevents anyone from spamming thousands of requests
   at once by limiting calls to a safe rate.
3. Friendly Neighbors (CORS): Allows our web dashboard to connect securely.
4. 24/7 Lifespan: Wakes up the background clockwork heartbeat when the server starts,
   and puts it to sleep peacefully when shutting down.
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from hydromesh.api.routes import _get_pipeline_for_plant, _plants, router
from hydromesh.api.stream import stream_manager
from hydromesh.ingest.scheduler import PlantScheduler
from hydromesh.logging import get_logger

log = get_logger(__name__)

# Sliding window rate limiter state: IP -> list of monotonic timestamps
_rate_limits: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_WINDOW_S = 60.0
_RATE_LIMIT_MAX_REQUESTS = 120


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup, background scheduler lifecycle, and graceful shutdown."""
    default_plant = _plants[0]
    pipeline = _get_pipeline_for_plant(default_plant)
    scheduler = PlantScheduler(pipeline, stream_manager, interval_s=2.0)

    # Start background twin simulation and WebSocket broadcast
    scheduler.start()
    app.state.scheduler = scheduler
    log.info("application_startup_complete", plant=default_plant.name)

    yield

    # Clean shutdown of scheduler
    await scheduler.stop()
    log.info("application_shutdown_complete")


def create_app() -> FastAPI:
    """Create and configure the hardened HydroMesh FastAPI application."""
    app = FastAPI(
        title="HydroMesh API",
        version="0.1.0",
        description="HydroMesh Autonomous Hydropower Operations & Multi-Agent Engine",
        lifespan=lifespan,
    )

    # 1. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Rate Limiting Middleware
    @app.middleware("http")
    async def rate_limiting_middleware(request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.monotonic()

        # Clean timestamps older than window
        timestamps = [ts for ts in _rate_limits[client_ip] if now - ts < _RATE_LIMIT_WINDOW_S]
        _rate_limits[client_ip] = timestamps

        if len(timestamps) >= _RATE_LIMIT_MAX_REQUESTS:
            log.warning("rate_limit_exceeded", client_ip=client_ip, count=len(timestamps))
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Maximum 120 requests per minute."},
            )

        _rate_limits[client_ip].append(now)
        return await call_next(request)

    # 3. Security Headers Middleware
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # 4. Mount API Routes
    app.include_router(router)

    return app
