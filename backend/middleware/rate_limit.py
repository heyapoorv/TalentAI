import time
import logging
from collections import defaultdict, deque
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("talentai.ratelimit")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter stored in process memory.
    Works for single-process deployments (1 Gunicorn worker or Docker container).
    For multi-worker, swap the dict for Redis.

    Defaults:
      - 60 requests / 60 seconds per IP for general routes
      - 10 requests / 60 seconds for auth routes (/api/auth/*)
    """

    def __init__(
        self,
        app,
        default_limit: int = 60,
        auth_limit: int = 10,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.default_limit = default_limit
        self.auth_limit = auth_limit
        self.window = window_seconds
        # { ip -> deque of timestamps }
        self._requests: dict[str, deque] = defaultdict(deque)

    def _get_limit(self, path: str) -> int:
        # Strict limits for sensitive auth entry points
        if path in ("/api/auth/login", "/api/auth/register"):
            return self.auth_limit
        return self.default_limit

    def _is_allowed(self, ip: str, path: str) -> tuple[bool, int, int]:
        """Returns (allowed, remaining, retry_after)."""
        now = time.time()
        limit = self._get_limit(path)
        bucket = self._requests[ip]

        # Drop entries outside the sliding window
        cutoff = now - self.window
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        remaining = limit - len(bucket)
        if remaining <= 0:
            retry_after = int(self.window - (now - bucket[0])) + 1
            return False, 0, retry_after

        bucket.append(now)
        return True, remaining - 1, 0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Pass through health checks, docs, and pre-flight OPTIONS requests
        if request.url.path in ("/", "/health", "/docs", "/openapi.json", "/redoc") or request.method == "OPTIONS":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        allowed, remaining, retry_after = self._is_allowed(ip, request.url.path)

        if not allowed:
            logger.warning(
                "rate_limit_exceeded",
                extra={"ip": ip, "path": request.url.path, "retry_after": retry_after},
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
