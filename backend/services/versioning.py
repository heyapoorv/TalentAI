"""
services/versioning.py

Central AI version registry for TalentAI.

Stores the current AI component versions in MongoDB (`ai_versions` collection)
and provides helpers to:
  - Read current versions (in-memory cache, refreshed every 60s)
  - Bump a component version
  - Stamp version metadata onto stored documents (resumes, applications)
  - Detect stale artifacts that need reprocessing

Version schema stored in MongoDB:
  {
    parser_version:    "v1",
    embedding_version: "v1",
    analysis_version:  "v1",
    copilot_version:   "v1",
    model_version:     "gemini-2.5-flash",
    updated_at:        ISODate,
    updated_by:        "system" | <user_id>
  }
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("talentai.versioning")

# ── Defaults (also written on first startup) ───────────────────────────────────
DEFAULT_VERSIONS: Dict[str, str] = {
    "parser_version":    "v1",
    "embedding_version": "v1",
    "analysis_version":  "v1",
    "copilot_version":   "v1",
    "model_version":     "gemini-2.5-flash",
}

VALID_COMPONENTS = {
    "parser_version",
    "embedding_version",
    "analysis_version",
    "copilot_version",
    "model_version",
}

# ── In-memory cache ────────────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_cache_ts: float = 0.0
_CACHE_TTL_SECONDS = 60.0

# ── Database reference (set during startup) ────────────────────────────────────
_db = None


def set_db(db) -> None:
    """Called once at app startup with the Motor database handle."""
    global _db
    _db = db


def _invalidate_cache() -> None:
    global _cache, _cache_ts
    _cache = {}
    _cache_ts = 0.0


# ══════════════════════════════════════════════════════════════════════════════
# READ
# ══════════════════════════════════════════════════════════════════════════════

async def get_current_versions(db=None) -> Dict[str, str]:
    """
    Return the current AI version config.
    Reads from in-memory cache (TTL 60s); falls back to MongoDB; falls back to defaults.
    """
    global _cache, _cache_ts

    now = time.monotonic()
    if _cache and (now - _cache_ts) < _CACHE_TTL_SECONDS:
        return dict(_cache)

    target_db = db or _db
    if target_db is None:
        return dict(DEFAULT_VERSIONS)

    try:
        doc = await target_db.ai_versions.find_one({}, sort=[("updated_at", -1)])
        if doc:
            versions = {k: doc.get(k, v) for k, v in DEFAULT_VERSIONS.items()}
        else:
            # First run — seed the collection
            versions = dict(DEFAULT_VERSIONS)
            await _seed_versions(target_db, versions)

        _cache = versions
        _cache_ts = now
        return dict(versions)

    except Exception as exc:
        logger.warning("versioning_read_failed", extra={"error": str(exc)})
        return dict(DEFAULT_VERSIONS)


async def _seed_versions(db, versions: Dict[str, str]) -> None:
    """Write the default version document on first startup."""
    try:
        await db.ai_versions.insert_one(
            {
                **versions,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": "system",
            }
        )
        logger.info("versioning_seeded", extra={"versions": versions})
    except Exception as exc:
        logger.warning("versioning_seed_failed", extra={"error": str(exc)})


# ══════════════════════════════════════════════════════════════════════════════
# WRITE / BUMP
# ══════════════════════════════════════════════════════════════════════════════

async def update_version(
    component: str,
    new_value: str,
    db=None,
    updated_by: str = "admin",
) -> Dict[str, str]:
    """
    Update a single version component and invalidate the in-memory cache.
    Returns the full updated versions dict.

    Triggers Redis cache invalidation for affected component.
    """
    if component not in VALID_COMPONENTS:
        raise ValueError(f"Unknown component '{component}'. Valid: {VALID_COMPONENTS}")

    target_db = db or _db
    if target_db is None:
        raise RuntimeError("Database not available")

    # Get existing doc
    existing = await target_db.ai_versions.find_one({}, sort=[("updated_at", -1)])
    if existing:
        new_doc = {k: existing.get(k, v) for k, v in DEFAULT_VERSIONS.items()}
    else:
        new_doc = dict(DEFAULT_VERSIONS)

    new_doc[component] = new_value
    new_doc["updated_at"] = datetime.now(timezone.utc)
    new_doc["updated_by"] = updated_by

    # Always insert a new version document (full audit trail)
    await target_db.ai_versions.insert_one(new_doc)

    _invalidate_cache()

    # Invalidate relevant caches
    await _invalidate_component_caches(component)

    logger.info(
        "version_updated",
        extra={"component": component, "new_value": new_value, "updated_by": updated_by},
    )

    return {k: new_doc.get(k, v) for k, v in DEFAULT_VERSIONS.items()}


async def _invalidate_component_caches(component: str) -> None:
    """Invalidate Redis caches when a version changes."""
    try:
        if component in ("analysis_version", "embedding_version", "model_version"):
            # Invalidate all RAG answer caches (pattern-based)
            from services.cache import get_redis_client
            client = get_redis_client()
            if client:
                cursor = 0
                deleted = 0
                while True:
                    cursor, keys = await client.scan(cursor, match="rag:*", count=100)
                    if keys:
                        await client.delete(*keys)
                        deleted += len(keys)
                    if cursor == 0:
                        break
                logger.info("rag_cache_invalidated_on_version_change", extra={"deleted": deleted})
    except Exception as exc:
        logger.warning("cache_invalidation_failed", extra={"error": str(exc)})


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENT STAMPING
# ══════════════════════════════════════════════════════════════════════════════

async def get_version_stamp(components: list[str], db=None) -> Dict[str, str]:
    """
    Return a dict of {component: version} for the given components.
    Used to stamp documents before insert/update.

    Example:
        stamp = await get_version_stamp(["parser_version", "embedding_version"])
        resume_doc.update(stamp)
    """
    versions = await get_current_versions(db=db)
    return {k: versions[k] for k in components if k in versions}


def is_stale(doc: Dict, component_key: str, current_version: str) -> bool:
    """
    Return True if the document was processed with an older version
    than the currently active one.

    Args:
        doc:             MongoDB document dict
        component_key:   e.g. "parser_version", "analysis_version"
        current_version: current version string e.g. "v2"
    """
    doc_version = doc.get(component_key, "v0")
    return doc_version != current_version


async def count_stale_documents(
    collection_name: str,
    component_key: str,
    db=None,
) -> Dict[str, int]:
    """
    Count how many documents in a collection need reprocessing.
    Returns {"total": N, "stale": M, "up_to_date": K}
    """
    target_db = db or _db
    if target_db is None:
        return {"total": 0, "stale": 0, "up_to_date": 0}

    versions = await get_current_versions(db=target_db)
    current = versions.get(component_key, "v1")

    collection = getattr(target_db, collection_name)
    total = await collection.count_documents({})
    up_to_date = await collection.count_documents({component_key: current})

    return {
        "total": total,
        "stale": total - up_to_date,
        "up_to_date": up_to_date,
        "current_version": current,
    }


# ══════════════════════════════════════════════════════════════════════════════
# VERSION HISTORY
# ══════════════════════════════════════════════════════════════════════════════

async def get_version_history(limit: int = 20, db=None) -> list:
    """Return the last N version change events."""
    target_db = db or _db
    if target_db is None:
        return []
    try:
        docs = (
            await target_db.ai_versions.find({})
            .sort("updated_at", -1)
            .limit(limit)
            .to_list(limit)
        )
        return [
            {
                "parser_version":    d.get("parser_version", "v1"),
                "embedding_version": d.get("embedding_version", "v1"),
                "analysis_version":  d.get("analysis_version", "v1"),
                "copilot_version":   d.get("copilot_version", "v1"),
                "model_version":     d.get("model_version", "gemini-2.5-flash"),
                "updated_at":        d.get("updated_at", "").isoformat() if d.get("updated_at") else "",
                "updated_by":        d.get("updated_by", "system"),
            }
            for d in docs
        ]
    except Exception as exc:
        logger.warning("version_history_read_failed", extra={"error": str(exc)})
        return []
