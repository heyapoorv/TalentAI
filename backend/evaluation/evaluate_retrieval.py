"""
evaluation/evaluate_retrieval.py

Retrieval evaluation benchmarks for the platform.

Metrics tracked:
  - Recall@k
  - Precision@k
  - MRR (Mean Reciprocal Rank)
  - Latency per query

Supports both:
  1. Real  mode → hits the live Qdrant + MongoDB pipeline
  2. Mock  mode → deterministic fallback for CI without live infra
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from typing import Dict, List, Optional

import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ══════════════════════════════════════════════════════════════════════════════
# BENCHMARK LOADER
# ══════════════════════════════════════════════════════════════════════════════

def load_benchmark(filepath: str) -> List[Dict]:
    with open(filepath, "r") as f:
        return json.load(f)


# ══════════════════════════════════════════════════════════════════════════════
# METRICS
# ══════════════════════════════════════════════════════════════════════════════

def precision_at_k(retrieved: List[str], relevant: List[str], k: int) -> float:
    retrieved_k = retrieved[:k]
    if not retrieved_k:
        return 0.0
    hits = len(set(retrieved_k) & set(relevant))
    return hits / k


def recall_at_k(retrieved: List[str], relevant: List[str], k: int) -> float:
    if not relevant:
        return 0.0
    hits = len(set(retrieved[:k]) & set(relevant))
    return hits / len(relevant)


def reciprocal_rank(retrieved: List[str], relevant: List[str]) -> float:
    for i, doc_id in enumerate(retrieved, start=1):
        if doc_id in relevant:
            return 1.0 / i
    return 0.0


# ══════════════════════════════════════════════════════════════════════════════
# RETRIEVAL ADAPTERS
# ══════════════════════════════════════════════════════════════════════════════

async def real_retrieve(
    query: str,
    workspace_id: str,
    k: int = 5,
) -> tuple[List[str], float]:
    """Run the live hybrid retrieval pipeline. Returns (doc_ids, latency_sec)."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from db.database import MONGO_URL, DB_NAME
    from services.retrieval import retrieve

    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    db     = client[DB_NAME]

    t0 = time.perf_counter()
    try:
        chunks = await retrieve(
            query=query,
            workspace_id=workspace_id,
            db=db,
            top_k=k,
        )
        latency = time.perf_counter() - t0
        # Return unique document_ids in ranked order
        seen, doc_ids = set(), []
        for ch in chunks:
            if ch.document_id not in seen:
                seen.add(ch.document_id)
                doc_ids.append(ch.document_id)
        return doc_ids, latency
    except Exception as exc:
        print(f"  [WARN] real_retrieve failed: {exc}")
        return [], time.perf_counter() - t0
    finally:
        client.close()


def mock_retrieve(query: str, k: int = 5) -> tuple[List[str], float]:
    """Deterministic keyword-based mock for CI environments."""
    q = query.lower()
    t0 = time.perf_counter()
    results: List[str] = []

    if "react" in q or "frontend" in q:
        results = ["john_doe_resume", "job_senior_frontend_dev", "alice_smith_resume"]
    elif "pytorch" in q or "tensorflow" in q or "machine learning" in q:
        results = ["alice_smith_resume", "job_ai_ml_engineer", "john_doe_resume"]
    elif "backend" in q or "go" in q:
        results = ["job_backend_engineer_go", "john_doe_resume"]
    else:
        results = ["john_doe_resume", "alice_smith_resume"]

    return results[:k], time.perf_counter() - t0


# ══════════════════════════════════════════════════════════════════════════════
# EVALUATION RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def run_retrieval_evaluation(
    benchmark_path: str,
    k: int = 3,
    use_real: bool = False,
    workspace_id: str = "eval_workspace",
) -> Dict:
    print("\n" + "=" * 56)
    print(f"RETRIEVAL EVALUATION  (k={k}, mode={'Real' if use_real else 'Mock'})")
    print("=" * 56)

    benchmark = load_benchmark(benchmark_path)

    precisions, recalls, rrs, latencies = [], [], [], []

    for idx, item in enumerate(benchmark):
        query    = item["query"]
        relevant = item["expected_document_ids"]

        if use_real:
            retrieved, lat = await real_retrieve(query, workspace_id, k)
        else:
            retrieved, lat = mock_retrieve(query, k)

        p   = precision_at_k(retrieved, relevant, k)
        r   = recall_at_k(retrieved, relevant, k)
        rr  = reciprocal_rank(retrieved, relevant)

        precisions.append(p)
        recalls.append(r)
        rrs.append(rr)
        latencies.append(lat)

        print(f"\nQ{idx+1}: {query}")
        print(f"  Expected : {relevant}")
        print(f"  Retrieved: {retrieved}")
        print(f"  P@{k}={p:.2f}  R@{k}={r:.2f}  RR={rr:.2f}  lat={lat*1000:.0f}ms")

    summary = {
        "mean_precision_at_k": float(np.mean(precisions)),
        "mean_recall_at_k":    float(np.mean(recalls)),
        "mrr":                 float(np.mean(rrs)),
        "mean_latency_ms":     float(np.mean(latencies) * 1000),
        "p95_latency_ms":      float(np.percentile(latencies, 95) * 1000),
        "k":                   k,
        "n_queries":           len(benchmark),
    }

    print("\n" + "=" * 56)
    print("RETRIEVAL SUMMARY")
    print("=" * 56)
    print(f"Mean Precision@{k} : {summary['mean_precision_at_k']:.4f}")
    print(f"Mean Recall@{k}    : {summary['mean_recall_at_k']:.4f}")
    print(f"Mean MRR           : {summary['mrr']:.4f}")
    print(f"Mean Latency       : {summary['mean_latency_ms']:.1f}ms")
    print(f"P95  Latency       : {summary['p95_latency_ms']:.1f}ms")
    print("=" * 56)

    return summary


if __name__ == "__main__":
    base  = os.path.dirname(os.path.abspath(__file__))
    bench = os.path.join(base, "benchmark_questions.json")
    asyncio.run(run_retrieval_evaluation(bench, k=3, use_real=False))
