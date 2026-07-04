"""
services/observability.py

Async, fire-and-forget metrics collection for TalentAI.

Design principles:
  - NEVER block the request path — all writes are fire-and-forget
  - Silently degrades if MongoDB is unavailable
  - Provides aggregation helpers for the Admin Dashboard
  - TTL index on `metrics.ts` auto-expires documents after METRICS_TTL_DAYS

Metric types:
  api_request    — every HTTP request (path, method, latency, status, user_id)
  gemini_call    — every Gemini API call (model, tokens, latency, success)
  cache_hit      — successful cache lookup
  cache_miss     — cache miss
  embed_call     — embedding generation call
  parse_call     — resume/document parsing call
  error          — any caught exception in services
  reprocess_job  — background reprocessing job completion
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("talentai.observability")

METRICS_TTL_DAYS = int(os.getenv("METRICS_TTL_DAYS", "7"))

# ── Database reference ─────────────────────────────────────────────────────────
_db = None
_initialized = False


def set_db(db) -> None:
    """Called once at startup."""
    global _db, _initialized
    _db = db
    _initialized = True


# ══════════════════════════════════════════════════════════════════════════════
# CORE RECORD FUNCTION (fire-and-forget)
# ══════════════════════════════════════════════════════════════════════════════

def record_metric(metric_type: str, **kwargs) -> None:
    """
    Fire-and-forget metric write. Non-blocking.
    Creates an asyncio task; if no event loop, silently skips.
    """
    if _db is None:
        return
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_write_metric(metric_type, **kwargs))
    except RuntimeError:
        pass  # No event loop available


async def _write_metric(metric_type: str, **kwargs) -> None:
    """Internal async write — never raises."""
    try:
        doc = {
            "ts": datetime.now(timezone.utc),
            "type": metric_type,
            **{k: v for k, v in kwargs.items() if v is not None},
        }
        await _db.metrics.insert_one(doc)
    except Exception:
        pass  # Silently drop — metrics must never break the app


# ══════════════════════════════════════════════════════════════════════════════
# SPECIALIZED RECORDERS
# ══════════════════════════════════════════════════════════════════════════════

def record_api_request(
    path: str,
    method: str,
    status_code: int,
    latency_ms: float,
    user_id: Optional[str] = None,
) -> None:
    record_metric(
        "api_request",
        path=path,
        method=method,
        status_code=status_code,
        latency_ms=latency_ms,
        user_id=user_id,
        is_error=status_code >= 400,
    )


def record_gemini_call(
    path: str,
    latency_ms: float,
    model: str = "gemini-2.5-flash",
    tokens_used: int = 0,
    success: bool = True,
    session_type: Optional[str] = None,
) -> None:
    # Simple blended estimate (avg between input/output for Gemini 2.5 Flash ~ $0.15/1M input, $0.60/1M output, so maybe $0.30/1M blended)
    estimated_spend = (tokens_used / 1_000_000) * 0.30 if tokens_used else 0.0
    
    record_metric(
        "gemini_call",
        path=path,
        latency_ms=latency_ms,
        model=model,
        tokens_used=tokens_used,
        success=success,
        session_type=session_type,
        estimated_spend=estimated_spend,
    )


def record_cache_event(
    hit: bool,
    path: str = "",
    workspace_id: Optional[str] = None,
) -> None:
    record_metric(
        "cache_hit" if hit else "cache_miss",
        path=path,
        workspace_id=workspace_id,
    )


def record_embed_call(
    latency_ms: float,
    doc_type: str = "resume",
    success: bool = True,
) -> None:
    record_metric(
        "embed_call",
        latency_ms=latency_ms,
        doc_type=doc_type,
        success=success,
    )


def record_parse_call(
    latency_ms: float,
    doc_type: str = "resume",
    success: bool = True,
    file_size_bytes: int = 0,
) -> None:
    record_metric(
        "parse_call",
        latency_ms=latency_ms,
        doc_type=doc_type,
        success=success,
        file_size_bytes=file_size_bytes,
    )


def record_error(
    error_type: str,
    path: str = "",
    message: str = "",
    user_id: Optional[str] = None,
) -> None:
    record_metric(
        "error",
        error_type=error_type,
        path=path,
        message=message[:500],  # cap length
        user_id=user_id,
    )


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD AGGREGATION QUERIES
# ══════════════════════════════════════════════════════════════════════════════

async def get_dashboard_stats(db=None, since_hours: int = 24) -> Dict[str, Any]:
    """
    Aggregate metrics for the admin dashboard.
    Returns a comprehensive stats dict covering the last `since_hours` hours.
    """
    target_db = db or _db
    if target_db is None:
        return _empty_stats()

    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    match_window = {"ts": {"$gte": since}}

    try:
        # Run aggregations concurrently
        results = await asyncio.gather(
            _agg_request_stats(target_db, match_window),
            _agg_gemini_stats(target_db, match_window),
            _agg_cache_stats(target_db, match_window),
            _agg_error_stats(target_db, match_window),
            _agg_timeseries(target_db, since_hours),
            _agg_top_endpoints(target_db, match_window),
            _agg_recent_errors(target_db),
            _agg_active_users(target_db, match_window),
            return_exceptions=True,
        )

        (
            req_stats,
            gemini_stats,
            cache_stats,
            error_stats,
            timeseries,
            top_endpoints,
            recent_errors,
            active_users,
        ) = [r if not isinstance(r, Exception) else {} for r in results]

        return {
            "since_hours": since_hours,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "requests": req_stats or {},
            "gemini": gemini_stats or {},
            "cache": cache_stats or {},
            "errors": error_stats or {},
            "timeseries": timeseries or [],
            "top_endpoints": top_endpoints or [],
            "recent_errors": recent_errors or [],
            "active_users": active_users if isinstance(active_users, int) else 0,
        }
    except Exception as exc:
        logger.error("dashboard_stats_failed", extra={"error": str(exc)})
        return _empty_stats()


def _empty_stats() -> Dict[str, Any]:
    return {
        "since_hours": 24,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "requests": {"total": 0, "error_rate": 0.0, "avg_latency_ms": 0.0, "p95_latency_ms": 0.0},
        "gemini": {"total_calls": 0, "avg_latency_ms": 0.0, "total_tokens": 0, "success_rate": 100.0, "estimated_spend": 0.0},
        "cache": {"hits": 0, "misses": 0, "hit_rate": 0.0},
        "errors": {"total": 0, "by_type": {}},
        "timeseries": [],
        "top_endpoints": [],
        "recent_errors": [],
        "active_users": 0,
    }


async def _agg_request_stats(db, match_window: dict) -> Dict:
    pipeline = [
        {"$match": {**match_window, "type": "api_request"}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "errors": {"$sum": {"$cond": ["$is_error", 1, 0]}},
                "avg_latency": {"$avg": "$latency_ms"},
                "latencies": {"$push": "$latency_ms"},
            }
        },
    ]
    docs = await db.metrics.aggregate(pipeline).to_list(1)
    if not docs:
        return {"total": 0, "error_rate": 0.0, "avg_latency_ms": 0.0, "p95_latency_ms": 0.0}

    d = docs[0]
    total = d.get("total", 0)
    errors = d.get("errors", 0)
    latencies = sorted(d.get("latencies", []))
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0

    return {
        "total": total,
        "error_rate": round((errors / total) * 100, 2) if total else 0.0,
        "avg_latency_ms": round(d.get("avg_latency", 0.0), 1),
        "p95_latency_ms": round(p95, 1),
    }


async def _agg_gemini_stats(db, match_window: dict) -> Dict:
    pipeline = [
        {"$match": {**match_window, "type": "gemini_call"}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "successes": {"$sum": {"$cond": ["$success", 1, 0]}},
                "avg_latency": {"$avg": "$latency_ms"},
                "total_tokens": {"$sum": "$tokens_used"},
                "estimated_spend": {"$sum": "$estimated_spend"},
            }
        },
    ]
    docs = await db.metrics.aggregate(pipeline).to_list(1)
    if not docs:
        return {"total_calls": 0, "avg_latency_ms": 0.0, "total_tokens": 0, "success_rate": 100.0}

    d = docs[0]
    total = d.get("total", 0)
    successes = d.get("successes", 0)
    return {
        "total_calls": total,
        "avg_latency_ms": round(d.get("avg_latency", 0.0), 1),
        "total_tokens": d.get("total_tokens", 0),
        "success_rate": round((successes / total) * 100, 1) if total else 100.0,
        "estimated_spend": round(d.get("estimated_spend", 0.0), 4),
    }


async def _agg_cache_stats(db, match_window: dict) -> Dict:
    pipeline = [
        {"$match": {**match_window, "type": {"$in": ["cache_hit", "cache_miss"]}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]
    docs = await db.metrics.aggregate(pipeline).to_list(10)
    hits = next((d["count"] for d in docs if d["_id"] == "cache_hit"), 0)
    misses = next((d["count"] for d in docs if d["_id"] == "cache_miss"), 0)
    total = hits + misses
    return {
        "hits": hits,
        "misses": misses,
        "hit_rate": round((hits / total) * 100, 1) if total else 0.0,
    }


async def _agg_error_stats(db, match_window: dict) -> Dict:
    pipeline = [
        {"$match": {**match_window, "type": "error"}},
        {"$group": {"_id": "$error_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    docs = await db.metrics.aggregate(pipeline).to_list(10)
    total = await db.metrics.count_documents({**match_window, "type": "error"})
    by_type = {d["_id"]: d["count"] for d in docs if d["_id"]}
    return {"total": total, "by_type": by_type}


async def _agg_timeseries(db, since_hours: int) -> List[Dict]:
    """Hourly request/error buckets for the sparkline chart."""
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    # Use 1-hour buckets for ≤48h, 6-hour buckets otherwise
    bucket_hours = 1 if since_hours <= 48 else 6

    pipeline = [
        {"$match": {"ts": {"$gte": since}, "type": "api_request"}},
        {
            "$group": {
                "_id": {
                    "$dateTrunc": {
                        "date": "$ts",
                        "unit": "hour",
                        "binSize": bucket_hours,
                    }
                },
                "requests": {"$sum": 1},
                "errors": {"$sum": {"$cond": ["$is_error", 1, 0]}},
                "avg_latency": {"$avg": "$latency_ms"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    docs = await db.metrics.aggregate(pipeline).to_list(200)
    return [
        {
            "ts": d["_id"].isoformat() if d.get("_id") else "",
            "requests": d.get("requests", 0),
            "errors": d.get("errors", 0),
            "avg_latency_ms": round(d.get("avg_latency", 0.0), 1),
        }
        for d in docs
    ]


async def _agg_top_endpoints(db, match_window: dict) -> List[Dict]:
    """Top 10 endpoints by total call volume + avg latency."""
    pipeline = [
        {"$match": {**match_window, "type": "api_request"}},
        {
            "$group": {
                "_id": "$path",
                "count": {"$sum": 1},
                "avg_latency": {"$avg": "$latency_ms"},
                "errors": {"$sum": {"$cond": ["$is_error", 1, 0]}},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    docs = await db.metrics.aggregate(pipeline).to_list(10)
    return [
        {
            "path": d["_id"],
            "count": d["count"],
            "avg_latency_ms": round(d.get("avg_latency", 0.0), 1),
            "error_rate": round((d["errors"] / d["count"]) * 100, 1) if d["count"] else 0.0,
        }
        for d in docs
    ]


async def _agg_recent_errors(db, limit: int = 20) -> List[Dict]:
    """Last N error events."""
    docs = (
        await db.metrics.find({"type": "error"})
        .sort("ts", -1)
        .limit(limit)
        .to_list(limit)
    )
    return [
        {
            "ts": d.get("ts", "").isoformat() if d.get("ts") else "",
            "error_type": d.get("error_type", "unknown"),
            "path": d.get("path", ""),
            "message": d.get("message", ""),
        }
        for d in docs
    ]


async def _agg_active_users(db, match_window: dict) -> int:
    """Count distinct user_ids in the time window."""
    result = await db.metrics.distinct("user_id", {**match_window, "user_id": {"$ne": None}})
    return len([u for u in result if u])


# ══════════════════════════════════════════════════════════════════════════════
# METRICS INDEX HELPER (called at startup)
# ══════════════════════════════════════════════════════════════════════════════

async def ensure_metrics_indexes(db) -> None:
    """Create TTL + query indexes on the metrics collection."""
    try:
        # TTL auto-expire
        await db.metrics.create_index(
            "ts",
            expireAfterSeconds=METRICS_TTL_DAYS * 86_400,
            name="metrics_ttl",
        )
        # Query indexes
        await db.metrics.create_index([("type", 1), ("ts", -1)], name="metrics_type_ts")
        await db.metrics.create_index([("path", 1), ("ts", -1)], name="metrics_path_ts")
        await db.metrics.create_index("user_id", sparse=True, name="metrics_user_id")
        logger.info("metrics_indexes_ensured")
    except Exception as exc:
        logger.warning("metrics_index_creation_failed", extra={"error": str(exc)})
