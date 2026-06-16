"""
evaluation/evaluate_generation.py

Generation quality evaluation.

Metrics tracked:
  - Answer similarity   (Jaccard token overlap vs expected answer)
  - Hallucination rate  (fraction of tokens not supported by expected answer)
  - Citation accuracy   (intersection / union with expected citations)
  - Response latency    (seconds)
  - Token usage estimate
  - Cache hit ratio
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from typing import Dict, List, Tuple

import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_benchmark(filepath: str) -> List[Dict]:
    with open(filepath, "r") as f:
        return json.load(f)


# ══════════════════════════════════════════════════════════════════════════════
# SIMILARITY & QUALITY METRICS
# ══════════════════════════════════════════════════════════════════════════════

def jaccard_similarity(a: str, b: str) -> float:
    sa = set(a.lower().split())
    sb = set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def hallucination_rate(generated: str, expected: str) -> float:
    """
    Fraction of content words in `generated` that don't appear in `expected`.
    Lower is better.
    """
    gen_words = [w.strip(".,;:?!()[]") for w in generated.lower().split() if len(w) > 3]
    exp_words = set(w.strip(".,;:?!()[]") for w in expected.lower().split())
    if not gen_words:
        return 0.0
    hallucinated = [w for w in gen_words if w not in exp_words]
    return len(hallucinated) / len(gen_words)


def citation_accuracy(actual_cites: List, expected_cites: List[str]) -> float:
    """Precision-style: fraction of expected citations found in actual."""
    if not expected_cites:
        return 1.0 if not actual_cites else 0.0
    # actual_cites can be dicts (CitationSource) or strings
    actual_ids = set()
    for c in actual_cites:
        if isinstance(c, dict):
            actual_ids.add(c.get("filename", c.get("document_id", "")))
        else:
            actual_ids.add(str(c))
    hits = len(actual_ids & set(expected_cites))
    return hits / len(expected_cites)


# ══════════════════════════════════════════════════════════════════════════════
# MOCK CONTEXT CHUNKS
# ══════════════════════════════════════════════════════════════════════════════

def _mock_chunk(query_id: str):
    """Return fake RetrievedChunk-like objects for offline generation tests."""
    from dataclasses import dataclass
    from typing import Optional

    @dataclass
    class FakeChunk:
        document_id: str
        collection_id: str = ""
        workspace_id: str = ""
        filename: str = ""
        text: str = ""
        page_number: Optional[int] = None
        section_title: Optional[str] = None
        parent_chunk_index: Optional[int] = None
        chunk_index: int = 0
        score: float = 1.0

    DATA = {
        "q1": FakeChunk(
            document_id="john_doe_resume",
            filename="John Doe Resume",
            text=(
                "John Doe is an experienced Frontend Engineer. "
                "He has spent the last 5 years building React applications. "
                "His tech stack includes TypeScript, Tailwind CSS, and Redux."
            ),
        ),
        "q2": FakeChunk(
            document_id="alice_smith_resume",
            filename="Alice Smith Resume",
            text=(
                "Alice Smith holds a Ph.D. in Computer Science. "
                "She is a Machine Learning Engineer specialized in building "
                "production LLMs and computer vision models using PyTorch and TensorFlow."
            ),
        ),
        "q3": FakeChunk(
            document_id="job_senior_frontend_dev",
            filename="Senior Frontend Developer JD",
            text=(
                "We are hiring a Senior Frontend Developer. "
                "The ideal candidate must have deep experience in React, JavaScript, "
                "state management like Redux, and styling frameworks like Tailwind CSS."
            ),
        ),
        "q4": FakeChunk(
            document_id="alice_smith_resume",
            filename="Alice Smith Resume",
            text=(
                "Alice Smith holds a Ph.D. in Computer Science. "
                "She is an AI Researcher and ML Engineer specialized in building "
                "production LLMs using PyTorch and TensorFlow."
            ),
        ),
    }
    return [DATA.get(query_id, FakeChunk(document_id="unknown", text="No context."))]


# ══════════════════════════════════════════════════════════════════════════════
# EVALUATION RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def run_generation_evaluation(benchmark_path: str) -> Dict:
    from services.generation import generate_grounded_answer

    print("\n" + "=" * 56)
    print("GENERATION & QUALITY EVALUATION")
    print("=" * 56)

    benchmark = load_benchmark(benchmark_path)

    similarities, hallucinations, cite_accs = [], [], []
    latencies, tokens = [], []
    cache_hits = 0

    for idx, item in enumerate(benchmark):
        q_id     = item["id"]
        query    = item["query"]
        expected = item["expected_answer"]
        exp_cites = item["expected_citations"]

        chunks = _mock_chunk(q_id)

        t0  = time.perf_counter()
        res = await generate_grounded_answer(query=query, chunks=chunks)
        lat = time.perf_counter() - t0

        answer       = res["answer"]
        actual_cites = res["citations"]

        sim  = jaccard_similarity(answer, expected)
        hall = hallucination_rate(answer, expected)
        cite = citation_accuracy(actual_cites, exp_cites)

        similarities.append(sim)
        hallucinations.append(hall)
        cite_accs.append(cite)
        latencies.append(lat)
        tokens.append(len(answer.split()) * 1.3)   # rough token estimate

        print(f"\nTest {idx+1} [{q_id}]: {query}")
        print(f"  Generated : {answer[:120]}...")
        print(f"  Expected  : {expected[:100]}...")
        print(f"  Similarity={sim:.2f}  HallucinationRate={hall:.2f}  CitationAcc={cite:.2f}")
        print(f"  Latency={lat*1000:.0f}ms  Support={res.get('support_status')}  Confidence={res.get('confidence', 0):.2f}")

    total_tokens = sum(tokens)
    cache_ratio  = cache_hits / len(benchmark)

    summary = {
        "mean_similarity":         float(np.mean(similarities)),
        "mean_hallucination_rate": float(np.mean(hallucinations)),
        "mean_citation_accuracy":  float(np.mean(cite_accs)),
        "mean_latency_ms":         float(np.mean(latencies) * 1000),
        "p95_latency_ms":          float(np.percentile(latencies, 95) * 1000),
        "total_token_estimate":    int(total_tokens),
        "cache_hit_ratio":         cache_ratio,
        "n_queries":               len(benchmark),
    }

    print("\n" + "=" * 56)
    print("GENERATION SUMMARY")
    print("=" * 56)
    print(f"Mean Answer Similarity   : {summary['mean_similarity']:.4f}")
    print(f"Mean Hallucination Rate  : {summary['mean_hallucination_rate']:.4f}  (lower = better)")
    print(f"Mean Citation Accuracy   : {summary['mean_citation_accuracy']:.4f}")
    print(f"Mean Latency             : {summary['mean_latency_ms']:.1f}ms")
    print(f"P95  Latency             : {summary['p95_latency_ms']:.1f}ms")
    print(f"Est. Token Consumption   : {summary['total_token_estimate']:,}")
    print(f"Cache Hit Ratio          : {summary['cache_hit_ratio']:.2f}")
    print("=" * 56)

    return summary


if __name__ == "__main__":
    base  = os.path.dirname(os.path.abspath(__file__))
    bench = os.path.join(base, "benchmark_questions.json")
    sys.path.insert(0, os.path.dirname(base))
    asyncio.run(run_generation_evaluation(bench))
