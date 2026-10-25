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

import os
import time
from collections import defaultdict
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from hydromesh.api.auth_routes import auth_router, me_router
from hydromesh.api.routes import _get_pipeline_for_plant, _plants, router
from hydromesh.api.site_routes import site_router
from hydromesh.api.stream import stream_manager
from hydromesh.ingest.scheduler import PlantScheduler
from hydromesh.logging import get_logger

log = get_logger(__name__)

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://hydromesh.app",
]


def get_allowed_origins() -> list[str]:
    """Retrieve allowed CORS origins from environment or sensible defaults."""
    env_origins = os.getenv("HYDROMESH_ALLOWED_ORIGINS")
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    return DEFAULT_ALLOWED_ORIGINS


# Sliding window rate limiter state: IP -> list of monotonic timestamps
_rate_limits: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_WINDOW_S = 60.0
_RATE_LIMIT_MAX_REQUESTS = 120

# Auth endpoint specific sliding window limits: (norm_path, method) -> (max_attempts, window_s)
_AUTH_RATE_CONFIG: dict[tuple[str, str], tuple[int, float]] = {
    ("/api/auth/login", "POST"): (10, 300.0),    # 10 attempts per 5 minutes
    ("/api/auth/register", "POST"): (5, 900.0),  # 5 attempts per 15 minutes
    ("/api/auth/guest", "POST"): (10, 600.0),    # 10 attempts per 10 minutes
}
_auth_rate_limits: dict[str, list[float]] = defaultdict(list)
_llm_rate_limits: dict[str, list[float]] = defaultdict(list)


def prune_stale_rate_limits(now: float | None = None) -> int:
    """Evict expired IPs and empty lists from all rate limiter state dictionaries."""
    current_time = now if now is not None else time.monotonic()
    evicted = 0

    for ip, ts_list in list(_rate_limits.items()):
        if not ts_list or current_time - ts_list[-1] >= _RATE_LIMIT_WINDOW_S:
            _rate_limits.pop(ip, None)
            evicted += 1

    for key, ts_list in list(_auth_rate_limits.items()):
        if not ts_list or current_time - ts_list[-1] >= 900.0:
            _auth_rate_limits.pop(key, None)
            evicted += 1

    for key, ts_list in list(_llm_rate_limits.items()):
        if not ts_list or current_time - ts_list[-1] >= 60.0:
            _llm_rate_limits.pop(key, None)
            evicted += 1

    return evicted


def reset_rate_limits() -> None:
    """Clear all sliding window rate limiter state (useful for tests)."""
    _rate_limits.clear()
    _auth_rate_limits.clear()
    _llm_rate_limits.clear()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup, background scheduler lifecycle, and graceful shutdown."""
    default_plant = _plants[0]
    pipeline = _get_pipeline_for_plant(default_plant)
    scheduler = PlantScheduler(pipeline, stream_manager, plants=_plants, interval_s=2.0)

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
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
    )

    # 2. Rate Limiting Middleware
    @app.middleware("http")
    async def rate_limiting_middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        client_ip = request.client.host if (request.client and getattr(request.client, "host", None)) else "127.0.0.1"
        now = time.monotonic()
        path = request.url.path.rstrip("/")
        method = request.method

        # 2a. Sensitive Auth Endpoint Limits
        auth_rule = _AUTH_RATE_CONFIG.get((path, method))
        if auth_rule:
            max_auth_reqs, auth_window_s = auth_rule
            auth_key = f"{method}:{path}:{client_ip}"
            auth_timestamps = [ts for ts in _auth_rate_limits[auth_key] if now - ts < auth_window_s]
            _auth_rate_limits[auth_key] = auth_timestamps

            if len(auth_timestamps) >= max_auth_reqs:
                oldest_ts = auth_timestamps[0] if auth_timestamps else now
                retry_after = max(1, int(auth_window_s - (now - oldest_ts)) + 1)
                log.warning("auth_rate_limit_exceeded", client_ip=client_ip, path=path, count=len(auth_timestamps))
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Rate limit exceeded for {path}. Maximum {max_auth_reqs} requests per {int(auth_window_s)} seconds.",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
            _auth_rate_limits[auth_key].append(now)

        # 2b. Compute Throttling on LLM-Intensive Endpoints (SEC-13)
        if path == "/api/live-query":
            llm_key = f"live-query:{client_ip}"
            llm_timestamps = [ts for ts in _llm_rate_limits[llm_key] if now - ts < 60.0]
            _llm_rate_limits[llm_key] = llm_timestamps

            if len(llm_timestamps) >= 5:
                oldest_ts = llm_timestamps[0] if llm_timestamps else now
                retry_after = max(1, int(60.0 - (now - oldest_ts)) + 1)
                log.warning("llm_compute_limit_exceeded", client_ip=client_ip, path=path, count=len(llm_timestamps))
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded for /api/live-query. Maximum 5 calls per minute.",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
            _llm_rate_limits[llm_key].append(now)

        elif path.startswith("/api/plants/") and path.endswith("/evaluate"):
            eval_key = f"evaluate:{client_ip}"
            eval_timestamps = [ts for ts in _llm_rate_limits[eval_key] if now - ts < 60.0]
            _llm_rate_limits[eval_key] = eval_timestamps

            if len(eval_timestamps) >= 10:
                oldest_ts = eval_timestamps[0] if eval_timestamps else now
                retry_after = max(1, int(60.0 - (now - oldest_ts)) + 1)
                log.warning("evaluate_compute_limit_exceeded", client_ip=client_ip, path=path, count=len(eval_timestamps))
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Rate limit exceeded for {path}. Maximum 10 calls per minute.",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
            _llm_rate_limits[eval_key].append(now)

        # 2c. Global Ingress Rate Limiting (120 req/min)
        timestamps = [ts for ts in _rate_limits[client_ip] if now - ts < _RATE_LIMIT_WINDOW_S]
        if timestamps:
            _rate_limits[client_ip] = timestamps
        else:
            _rate_limits.pop(client_ip, None)

        if len(timestamps) >= _RATE_LIMIT_MAX_REQUESTS:
            oldest_ts = timestamps[0] if timestamps else now
            retry_after = max(1, int(_RATE_LIMIT_WINDOW_S - (now - oldest_ts)) + 1)
            log.warning("rate_limit_exceeded", client_ip=client_ip, count=len(timestamps))
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Maximum 120 requests per minute."},
                headers={"Retry-After": str(retry_after)},
            )

        _rate_limits[client_ip].append(now)
        response: Response = await call_next(request)
        return response

    # 3. Security Headers Middleware
    @app.middleware("http")
    async def security_headers_middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # 4. Mount API Routes
    app.include_router(me_router)
    app.include_router(auth_router)
    app.include_router(site_router)
    app.include_router(router)

    return app
