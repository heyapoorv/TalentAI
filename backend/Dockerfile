# ==============================================================================
# TalentAI Backend — Production Dockerfile
# Multi-stage build: builder → runtime
# ==============================================================================

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# System deps for building wheels (e.g. bcrypt, numpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install into an isolated prefix so we can copy cleanly
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Security: run as non-root
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy source
COPY --chown=appuser:appgroup . .

# Drop root
USER appuser

EXPOSE 8000

# Health check — Docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Gunicorn with Uvicorn workers:
#   -w 2         → 2 worker processes (adjust to (2 * CPU) + 1 for CPU-bound)
#   -k uvicorn   → async ASGI workers
#   --timeout 120→ long timeout for LLM calls
CMD ["gunicorn", "main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
