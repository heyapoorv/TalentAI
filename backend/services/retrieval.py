"""
services/retrieval.py

Advanced hybrid retrieval pipeline implementing:
  1. Dense vector search  (Gemini 768d via Qdrant)
  2. BM25 sparse search   (Qdrant sparse vectors)
  3. RRF fusion           (Reciprocal Rank Fusion)
  4. Neighbour expansion  (fetch sibling/parent chunks from MongoDB)
  5. Cross-encoder rerank (local sentence-transformers CrossEncoder)
  6. Context deduplication (Jaccard token overlap threshold)

Tenant isolation is enforced at every step via payload filter on
workspace_id + optional collection_id / document_ids.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

logger = logging.getLogger("talentai.retrieval")

# ── RRF constant (higher k → smoother ranking fusion) ─────────────────────────
_RRF_K = 60

# ── Top-K per sub-retriever before fusion ─────────────────────────────────────
_DENSE_TOP_K  = 20
_SPARSE_TOP_K = 20

# ── How many neighbour chunks to expand per hit ───────────────────────────────
_NEIGHBOUR_WINDOW = 1          # 1 chunk before + 1 after

# ── Deduplication similarity threshold ────────────────────────────────────────
_DEDUP_THRESHOLD = 0.85        # Jaccard: above → drop duplicate

# ══════════════════════════════════════════════════════════════════════════════
# DATA TYPES
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class RetrievedChunk:
    chunk_id: str                   # Qdrant point id
    document_id: str
    collection_id: str
    workspace_id: str
    filename: str
    text: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    parent_chunk_index: Optional[int] = None
    chunk_index: int = 0
    score: float = 0.0              # final reranked score


# ══════════════════════════════════════════════════════════════════════════════
# QDRANT SEARCH HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _build_qdrant_filter(
    workspace_id: str,
    collection_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
):
    """Build a Qdrant Filter for strict tenant isolation."""
    from qdrant_client.http.models import Filter, FieldCondition, MatchValue, MatchAny

    must = [FieldCondition(key="workspace_id", match=MatchValue(value=workspace_id))]

    if collection_id:
        must.append(FieldCondition(key="collection_id", match=MatchValue(value=collection_id)))

    if document_ids:
        must.append(FieldCondition(key="document_id", match=MatchAny(any=document_ids)))

    return Filter(must=must)


def _dense_search(
    query_vector: List[float],
    qdrant_filter,
    top_k: int = _DENSE_TOP_K,
) -> List[Dict]:
    """Synchronous Qdrant dense vector search."""
    from services.embedding import get_qdrant_client, QDRANT_COLLECTION

    client = get_qdrant_client()
    if not client:
        return []

    try:
        results = client.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=("dense", query_vector),
            query_filter=qdrant_filter,
            limit=top_k,
            with_payload=True,
        )
        return [
            {
                "chunk_id": str(r.id),
                "score": r.score,
                "payload": r.payload or {},
            }
            for r in results
        ]
    except Exception as exc:
        logger.error("dense_search_failed", extra={"error": str(exc)})
        return []


def _sparse_search(
    query_text: str,
    qdrant_filter,
    top_k: int = _SPARSE_TOP_K,
) -> List[Dict]:
    """Synchronous Qdrant sparse (BM25) vector search."""
    from qdrant_client.http.models import SparseVector
    from services.embedding import get_qdrant_client, QDRANT_COLLECTION
    from services.ingestion import _compute_corpus_idf, _build_sparse_vector

    client = get_qdrant_client()
    if not client:
        return []

    try:
        # Build a one-document IDF (approximate) for the query itself
        vocab, idf = _compute_corpus_idf([query_text])
        indices, values = _build_sparse_vector(query_text, vocab, idf)

        if not indices:
            return []

        results = client.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=("sparse", SparseVector(indices=indices, values=values)),
            query_filter=qdrant_filter,
            limit=top_k,
            with_payload=True,
        )
        return [
            {
                "chunk_id": str(r.id),
                "score": r.score,
                "payload": r.payload or {},
            }
            for r in results
        ]
    except Exception as exc:
        logger.error("sparse_search_failed", extra={"error": str(exc)})
        return []


# ══════════════════════════════════════════════════════════════════════════════
# RECIPROCAL RANK FUSION
# ══════════════════════════════════════════════════════════════════════════════

def _rrf_fuse(
    dense_hits: List[Dict],
    sparse_hits: List[Dict],
    k: int = _RRF_K,
) -> List[Dict]:
    """
    Merge two ranked lists via RRF.
    RRF(d) = Σ  1 / (k + rank_m(d))
    """
    scores: Dict[str, float] = {}
    payloads: Dict[str, Dict] = {}

    for rank, hit in enumerate(dense_hits, start=1):
        cid = hit["chunk_id"]
        scores[cid]   = scores.get(cid, 0.0) + 1.0 / (k + rank)
        payloads[cid] = hit["payload"]

    for rank, hit in enumerate(sparse_hits, start=1):
        cid = hit["chunk_id"]
        scores[cid]   = scores.get(cid, 0.0) + 1.0 / (k + rank)
        if cid not in payloads:
            payloads[cid] = hit["payload"]

    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [{"chunk_id": cid, "score": sc, "payload": payloads[cid]} for cid, sc in fused]


# ══════════════════════════════════════════════════════════════════════════════
# NEIGHBOUR EXPANSION
# ══════════════════════════════════════════════════════════════════════════════

async def _expand_neighbours(
    hits: List[Dict],
    db,
    window: int = _NEIGHBOUR_WINDOW,
) -> List[Dict]:
    """
    For each top hit, fetch adjacent chunks from MongoDB to restore context.
    Returns deduplicated, order-preserving expanded list.
    """
    seen_chunk_ids = {h["chunk_id"] for h in hits}
    expanded: List[Dict] = list(hits)

    for hit in hits:
        payload = hit["payload"]
        document_id  = payload.get("document_id")
        chunk_index  = payload.get("chunk_index", 0)

        if not document_id:
            continue

        for delta in range(-window, window + 1):
            if delta == 0:
                continue  # already have the original
            neighbour_index = chunk_index + delta
            if neighbour_index < 0:
                continue

            neighbour = await db.chunks.find_one(
                {"document_id": document_id, "chunk_index": neighbour_index}
            )
            if neighbour and str(neighbour.get("qdrant_point_id", "")) not in seen_chunk_ids:
                point_id = str(neighbour.get("qdrant_point_id", f"nb_{document_id}_{neighbour_index}"))
                seen_chunk_ids.add(point_id)
                expanded.append(
                    {
                        "chunk_id": point_id,
                        "score": hit["score"] * 0.85,   # slight discount for neighbours
                        "payload": {
                            "document_id": document_id,
                            "collection_id": payload.get("collection_id", ""),
                            "workspace_id": payload.get("workspace_id", ""),
                            "chunk_index": neighbour_index,
                            "page_number": neighbour.get("page_number"),
                            "section_title": neighbour.get("section_title"),
                            "parent_chunk_index": neighbour.get("parent_chunk_index"),
                            "filename": payload.get("filename", ""),
                            "text": neighbour["text"],
                        },
                    }
                )

    return expanded


# ══════════════════════════════════════════════════════════════════════════════
# CROSS-ENCODER RERANKER
# ══════════════════════════════════════════════════════════════════════════════

_reranker = None


def _get_reranker():
    """Lazily load the cross-encoder reranker (local, no network)."""
    global _reranker
    if _reranker is not None:
        return _reranker

    try:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
        logger.info("cross_encoder_loaded")
    except Exception as exc:
        logger.warning("cross_encoder_unavailable", extra={"error": str(exc)})
        _reranker = None

    return _reranker


def _rerank(query: str, hits: List[Dict]) -> List[Dict]:
    """
    Re-rank hits using the cross-encoder.
    Falls back to original RRF scores if the model is unavailable.
    """
    reranker = _get_reranker()
    if not reranker or not hits:
        return hits

    try:
        texts = [h["payload"].get("text", "") for h in hits]
        pairs = [(query, t) for t in texts]
        scores = reranker.predict(pairs).tolist()

        for hit, sc in zip(hits, scores):
            hit["score"] = float(sc)

        return sorted(hits, key=lambda x: x["score"], reverse=True)
    except Exception as exc:
        logger.warning("reranker_failed_fallback", extra={"error": str(exc)})
        return hits


# ══════════════════════════════════════════════════════════════════════════════
# CONTEXT DEDUPLICATION
# ══════════════════════════════════════════════════════════════════════════════

def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _deduplicate(hits: List[Dict], threshold: float = _DEDUP_THRESHOLD) -> List[Dict]:
    """Remove chunks that are near-duplicates of an already-accepted chunk."""
    accepted: List[Dict] = []
    accepted_texts: List[str] = []

    for hit in hits:
        text = hit["payload"].get("text", "")
        is_dup = any(_jaccard(text, at) >= threshold for at in accepted_texts)
        if not is_dup:
            accepted.append(hit)
            accepted_texts.append(text)

    return accepted


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

async def retrieve(
    *,
    query: str,
    workspace_id: str,
    db,
    collection_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
    top_k: int = 6,
) -> List[RetrievedChunk]:
    """
    Full hybrid retrieval pipeline.

    Args:
        query:          Natural-language query string.
        workspace_id:   Tenant workspace — enforced as hard isolation filter.
        db:             AsyncIOMotorDatabase for neighbour expansion.
        collection_id:  Narrow to one collection (optional).
        document_ids:   Narrow to specific documents (optional).
        top_k:          Final number of chunks to return after reranking.

    Returns:
        Ordered list of RetrievedChunk (best first).
    """
    import asyncio
    from services.embedding import get_query_embedding

    loop = asyncio.get_event_loop()

    # ── 1. Build tenant isolation filter ──────────────────────────────────────
    qdrant_filter = _build_qdrant_filter(workspace_id, collection_id, document_ids)

    # ── 2. Dense + Sparse retrieval (parallel) ────────────────────────────────
    query_vec = await loop.run_in_executor(None, get_query_embedding, query)

    dense_task  = loop.run_in_executor(None, _dense_search,  query_vec,   qdrant_filter, _DENSE_TOP_K)
    sparse_task = loop.run_in_executor(None, _sparse_search, query,       qdrant_filter, _SPARSE_TOP_K)

    dense_hits, sparse_hits = await asyncio.gather(dense_task, sparse_task)

    logger.info(
        "retrieval_raw",
        extra={"dense": len(dense_hits), "sparse": len(sparse_hits), "workspace": workspace_id},
    )

    # ── 3. RRF fusion ──────────────────────────────────────────────────────────
    fused = _rrf_fuse(dense_hits, sparse_hits)

    # Take top 2*top_k before expansion to limit DB round-trips
    fused = fused[: top_k * 2]

    # ── 4. Neighbour expansion ─────────────────────────────────────────────────
    expanded = await _expand_neighbours(fused, db)

    # ── 5. Cross-encoder rerank ────────────────────────────────────────────────
    reranked = await loop.run_in_executor(None, _rerank, query, expanded)

    # ── 6. Context deduplication ───────────────────────────────────────────────
    deduped = _deduplicate(reranked)

    # ── 7. Build final results ─────────────────────────────────────────────────
    results: List[RetrievedChunk] = []
    for hit in deduped[:top_k]:
        p = hit["payload"]
        results.append(
            RetrievedChunk(
                chunk_id=hit["chunk_id"],
                document_id=p.get("document_id", ""),
                collection_id=p.get("collection_id", ""),
                workspace_id=p.get("workspace_id", workspace_id),
                filename=p.get("filename", ""),
                text=p.get("text", ""),
                page_number=p.get("page_number"),
                section_title=p.get("section_title"),
                parent_chunk_index=p.get("parent_chunk_index"),
                chunk_index=p.get("chunk_index", 0),
                score=round(hit["score"], 6),
            )
        )

    logger.info(
        "retrieval_final",
        extra={"results": len(results), "workspace": workspace_id},
    )
    return results
