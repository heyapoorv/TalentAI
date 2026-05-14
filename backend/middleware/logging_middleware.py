import time
import uuid
import json
import logging
import sys
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# ── Structured JSON log formatter ───────────────────────────────────────────
class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
            "module":    record.module,
            "line":      record.lineno,
        }
        # Attach any extra fields passed via logger.info(..., extra={...})
        for key, val in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ):
                log_obj[key] = val

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, default=str)


def configure_logging(level: str = "INFO") -> None:
    """Call once at startup to configure global JSON logging."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Quieten noisy third-party loggers
    for noisy in ("uvicorn.access", "motor", "pymongo", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


# ── Request logging + tracing middleware ─────────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Attaches a unique X-Request-ID to every request, logs structured
    request/response metadata, and measures latency.
    """

    logger = logging.getLogger("talentai.http")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start = time.perf_counter()

        self.logger.info(
            "request_received",
            extra={
                "request_id": request_id,
                "method":     request.method,
                "path":       request.url.path,
                "query":      str(request.url.query),
                "client_ip":  request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", ""),
            },
        )

        response: Response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        self.logger.info(
            "request_completed",
            extra={
                "request_id":  request_id,
                "method":      request.method,
                "path":        request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        return response
