"""
services/ingestion.py

Full document ingestion pipeline:
  1. Parse file bytes → ParsedDocument
  2. Deterministic chunking (clause / semantic / hybrid)
  3. Gemini text-embedding-004 (768d) per chunk
  4. BM25 sparse vector computation per chunk
  5. Batch upsert → Qdrant (dense + sparse, tenant payload)
  6. Chunk records → MongoDB (for neighbour expansion)
  7. Update document status in MongoDB

All operations are async-friendly; heavy CPU work is run in a thread executor.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

logger = logging.getLogger("talentai.ingestion")


# ══════════════════════════════════════════════════════════════════════════════
# BM25 SPARSE VECTOR HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _build_sparse_vector(
    text: str,
    vocab: Dict[str, int],
    idf: Dict[str, float],
) -> tuple[list[int], list[float]]:
    """
    Produce a sparse (indices, values) pair for one chunk using TF-IDF weights.
    Vocabulary and IDF are built corpus-wide before this is called per-chunk.
    """
    from collections import Counter

    tokens = text.lower().split()
    tf = Counter(tokens)
    total = len(tokens) or 1

    indices: list[int] = []
    values: list[float] = []
    for token, count in tf.items():
        if token in vocab:
            idx = vocab[token]
            tfidf = (count / total) * idf.get(token, 1.0)
            indices.append(idx)
            values.append(float(tfidf))

    return indices, values


def _compute_corpus_idf(texts: list[str]) -> tuple[dict[str, int], dict[str, float]]:
    """Build a term → int vocab and term → IDF mapping from a list of texts."""
    import math
    from collections import Counter

    n = len(texts)
    df: Counter = Counter()
    for text in texts:
        unique_tokens = set(text.lower().split())
        df.update(unique_tokens)

    vocab: dict[str, int] = {term: idx for idx, (term, _) in enumerate(df.most_common())}
    idf: dict[str, float] = {
        term: math.log((n + 1) / (freq + 1)) + 1.0
        for term, freq in df.items()
    }
    return vocab, idf


# ══════════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

async def ingest_document(
    *,
    file_bytes: bytes,
    filename: str,
    document_id: str,
    collection_id: str,
    workspace_id: str,
    org_id: str,
    db,  # AsyncIOMotorDatabase
) -> dict:
    """
    Full ingestion pipeline for one uploaded document.
    Returns a summary dict with chunk_count, doc_type, page_count.
    """
    from services.parser import parse_document
    from services.embedding import get_embedding, get_query_embedding, batch_upsert_chunks_to_qdrant

    loop = asyncio.get_event_loop()

    # ── 1. Mark document as processing ────────────────────────────────────────
    await db.documents.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": {"status": "processing"}},
    )

    try:
        # ── 2. Parse document (CPU-bound → thread pool) ────────────────────────
        parsed = await loop.run_in_executor(None, parse_document, file_bytes, filename)

        if not parsed.raw_text.strip():
            raise ValueError("Document produced no extractable text.")

        # ── 3. Build corpus-level IDF for sparse BM25 vectors ─────────────────
        chunk_texts = [ch.text for ch in parsed.chunks]
        vocab, idf = await loop.run_in_executor(
            None, _compute_corpus_idf, chunk_texts
        )

        # ── 4. Embed each chunk + compute sparse vector ────────────────────────
        qdrant_points: list[dict] = []
        mongo_chunks: list[dict] = []

        for chunk in parsed.chunks:
            point_id = str(uuid.uuid4())

            # Dense embedding (Gemini 768d)
            dense_vec = await loop.run_in_executor(None, get_embedding, chunk.text)

            # Sparse BM25 vector
            sp_indices, sp_values = await loop.run_in_executor(
                None, _build_sparse_vector, chunk.text, vocab, idf
            )

            payload = {
                "document_id": document_id,
                "collection_id": collection_id,
                "workspace_id": workspace_id,
                "org_id": org_id,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "section_title": chunk.section_title,
                "parent_chunk_index": chunk.parent_chunk_index,
                "filename": filename,
            }

            qdrant_points.append(
                {
                    "point_id": point_id,
                    "text": chunk.text,
                    "dense_vector": dense_vec,
                    "sparse_indices": sp_indices,
                    "sparse_values": sp_values,
                    "payload": payload,
                }
            )

            mongo_chunks.append(
                {
                    "document_id": document_id,
                    "collection_id": collection_id,
                    "workspace_id": workspace_id,
                    "org_id": org_id,
                    "chunk_index": chunk.chunk_index,
                    "parent_chunk_index": chunk.parent_chunk_index,
                    "text": chunk.text,
                    "page_number": chunk.page_number,
                    "section_title": chunk.section_title,
                    "token_count": chunk.token_count,
                    "qdrant_point_id": point_id,
                }
            )

        # ── 5. Upsert to Qdrant (batch) ────────────────────────────────────────
        upserted = await loop.run_in_executor(
            None, batch_upsert_chunks_to_qdrant, qdrant_points
        )
        logger.info(
            "qdrant_upsert_done",
            extra={"document_id": document_id, "chunks": upserted},
        )

        # ── 6. Save chunks to MongoDB ──────────────────────────────────────────
        if mongo_chunks:
            # Remove old chunks for this document (re-ingestion / version bump)
            await db.chunks.delete_many({"document_id": document_id})
            await db.chunks.insert_many(mongo_chunks)

        # ── 7. Mark document as indexed ────────────────────────────────────────
        doc_hash = hashlib.sha256(file_bytes).hexdigest()
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {
                "$set": {
                    "status": "indexed",
                    "doc_type": parsed.doc_type,
                    "page_count": parsed.page_count,
                    "chunk_count": len(parsed.chunks),
                    "doc_hash": doc_hash,
                    "indexed_at": datetime.now(timezone.utc),
                }
            },
        )

        logger.info(
            "ingestion_complete",
            extra={
                "document_id": document_id,
                "doc_type": parsed.doc_type,
                "pages": parsed.page_count,
                "chunks": len(parsed.chunks),
            },
        )

        return {
            "document_id": document_id,
            "doc_type": parsed.doc_type,
            "page_count": parsed.page_count,
            "chunk_count": len(parsed.chunks),
        }

    except Exception as exc:
        logger.error("ingestion_failed", extra={"document_id": document_id, "error": str(exc)})
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"status": "failed"}},
        )
        raise
