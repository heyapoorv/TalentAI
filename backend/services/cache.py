"""
services/cache.py

Tenant-aware Redis cache for the Knowledge Platform.

Key structure:
  rag:{workspace_id}:{doc_version_hash}:{question_hash}  → RAG answer
  embed:{text_hash}                                      → embedding vector
  session:{session_id}                                   → chat history

All keys are namespaced by workspace_id to prevent cross-tenant collisions.
Document version is encoded in the key so stale cache is automatically
skipped when documents are re-indexed (version hash changes).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger("talentai.cache")

REDIS_URL            = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DEFAULT_TTL_SECONDS  = 3600          # 1 hour
RAG_TTL_SECONDS      = 86_400        # 24 hours for RAG answers
EMBED_TTL_SECONDS    = 604_800       # 7 days for embeddings
SESSION_TTL_SECONDS  = 3_600         # 1 hour for chat history

_redis_client = None


# ══════════════════════════════════════════════════════════════════════════════
# CLIENT
# ══════════════════════════════════════════════════════════════════════════════

def get_redis_client():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        logger.info("redis_client_initialized", extra={"url": REDIS_URL})
    except ImportError:
        logger.warning("redis_library_not_installed caching_disabled")
    except Exception as exc:
        logger.error("redis_init_failed", extra={"error": str(exc)})
    return _redis_client


# ══════════════════════════════════════════════════════════════════════════════
# KEY BUILDERS
# ══════════════════════════════════════════════════════════════════════════════

def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def rag_cache_key(
    workspace_id: str,
    question: str,
    document_version_hash: str = "v1",
) -> str:
    """
    Key: rag:{workspace_id}:{doc_version_hash}:{question_hash}
    document_version_hash should be updated whenever documents in the workspace
    are re-indexed (e.g., sha256 of sorted document indexed_at timestamps).
    """
    return f"rag:{workspace_id}:{document_version_hash}:{_hash(question)}"


def embed_cache_key(text: str) -> str:
    return f"embed:{_hash(text)}"


def session_history_key(session_id: str) -> str:
    return f"session_history:{session_id}"


# ══════════════════════════════════════════════════════════════════════════════
# GENERIC GET / SET
# ══════════════════════════════════════════════════════════════════════════════

async def get_cache(key: str) -> Optional[Any]:
    client = get_redis_client()
    if not client:
        return None
    try:
        val = await client.get(key)
        return json.loads(val) if val else None
    except Exception as exc:
        logger.error("cache_get_error", extra={"key": key, "error": str(exc)})
        return None


async def set_cache(key: str, value: Any, expire_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    client = get_redis_client()
    if not client:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=expire_seconds)
    except Exception as exc:
        logger.error("cache_set_error", extra={"key": key, "error": str(exc)})


async def delete_cache(key: str) -> None:
    client = get_redis_client()
    if not client:
        return
    try:
        await client.delete(key)
    except Exception as exc:
        logger.error("cache_delete_error", extra={"key": key, "error": str(exc)})


# ══════════════════════════════════════════════════════════════════════════════
# RAG ANSWER CACHE (tenant-aware)
# ══════════════════════════════════════════════════════════════════════════════

async def get_rag_cache(
    workspace_id: str,
    question: str,
    doc_version_hash: str = "v1",
) -> Optional[Dict]:
    from services.observability import record_cache_event
    key = rag_cache_key(workspace_id, question, doc_version_hash)
    result = await get_cache(key)
    record_cache_event(hit=(result is not None), path="rag_answer", workspace_id=workspace_id)
    return result


async def set_rag_cache(
    workspace_id: str,
    question: str,
    answer: Dict,
    doc_version_hash: str = "v1",
) -> None:
    key = rag_cache_key(workspace_id, question, doc_version_hash)
    await set_cache(key, answer, expire_seconds=RAG_TTL_SECONDS)


async def invalidate_workspace_cache(workspace_id: str) -> int:
    """Delete all RAG cache keys for a workspace (e.g. after bulk re-ingestion)."""
    client = get_redis_client()
    if not client:
        return 0
    try:
        pattern = f"rag:{workspace_id}:*"
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = await client.scan(cursor, match=pattern, count=100)
            if keys:
                await client.delete(*keys)
                deleted += len(keys)
            if cursor == 0:
                break
        logger.info("workspace_cache_invalidated", extra={"workspace_id": workspace_id, "deleted": deleted})
        return deleted
    except Exception as exc:
        logger.error("cache_invalidate_error", extra={"error": str(exc)})
        return 0


# ══════════════════════════════════════════════════════════════════════════════
# CHAT SESSION HISTORY CACHE
# ══════════════════════════════════════════════════════════════════════════════

async def get_session_history(session_id: str) -> List[Dict]:
    key = session_history_key(session_id)
    data = await get_cache(key)
    return data if isinstance(data, list) else []


async def append_session_message(session_id: str, message: Dict, max_turns: int = 20) -> None:
    """Append a message to in-memory session history (capped at max_turns*2 messages)."""
    key = session_history_key(session_id)
    history = await get_session_history(session_id)
    history.append(message)
    # Keep only last N turns
    history = history[-(max_turns * 2):]
    await set_cache(key, history, expire_seconds=SESSION_TTL_SECONDS)


async def clear_session_history(session_id: str) -> None:
    await delete_cache(session_history_key(session_id))


# ══════════════════════════════════════════════════════════════════════════════
# WORKSPACE VERSION HASH  (for cache key rotation on re-ingestion)
# ══════════════════════════════════════════════════════════════════════════════

async def compute_workspace_version_hash(workspace_id: str, db) -> str:
    """
    Compute a short hash from all document indexed_at timestamps in the workspace.
    Changes whenever any document is re-indexed → automatically invalidates old cache.
    """
    try:
        docs = await db.documents.find(
            {"workspace_id": workspace_id, "status": "indexed"},
            {"indexed_at": 1},
        ).sort("indexed_at", 1).to_list(None)

        ts_str = "|".join(str(d.get("indexed_at", "")) for d in docs)
        return hashlib.sha256(ts_str.encode()).hexdigest()[:12]
    except Exception:
        return "v1"
