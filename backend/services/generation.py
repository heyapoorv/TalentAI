"""
services/generation.py

Grounded answer generation with post-generation verification.

Pipeline:
  Retrieved chunks
      ↓
  Structured grounded prompt → Gemini Flash (primary)
                             → Ollama Qwen 14B (fallback)
      ↓
  JSON answer + inline citations
      ↓
  Verification layer (claim ↔ source chunk alignment)
      ↓
  RAGAnswerResponse { answer, citations, confidence, support_status }

LLMs are ONLY used for answer generation.
All chunking / deduplication / metadata extraction is deterministic.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("talentai.generation")

LLM_TIMEOUT_SECONDS   = 30.0
MAX_RETRIES           = 2
OLLAMA_URL            = None   # loaded lazily from env


# ══════════════════════════════════════════════════════════════════════════════
# LLM CLIENTS
# ══════════════════════════════════════════════════════════════════════════════

def get_gemini_model(model_name: str = "gemini-2.5-flash", system_instruction: str = None):
    """Lazily initialise and return a Gemini GenerativeModel."""
    import os
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        if system_instruction:
            return genai.GenerativeModel(model_name, system_instruction=system_instruction)
        return genai.GenerativeModel(model_name)
    except Exception as exc:
        logger.error("gemini_model_init_failed", extra={"error": str(exc)})
        return None


async def _call_ollama(prompt: str, model_name: str = "qwen:14b") -> str:
    """Call local Ollama Qwen 14B fallback."""
    import os
    import aiohttp

    url = os.getenv("OLLAMA_URL", "http://localhost:11434") + "/api/generate"
    payload = {"model": model_name, "prompt": prompt, "stream": False, "format": "json"}
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=LLM_TIMEOUT_SECONDS)) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data.get("response", "")


async def _call_gemini(prompt: str) -> Tuple[str, int]:
    """Async Gemini call with JSON mode. Returns (text, total_tokens)."""
    import google.generativeai as genai

    model = get_gemini_model()
    if not model:
        raise RuntimeError("Gemini not configured")

    async def _gen():
        return await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json"),
        )

    response = await asyncio.wait_for(_gen(), timeout=LLM_TIMEOUT_SECONDS)
    
    tokens = 0
    try:
        tokens = response.usage_metadata.total_token_count
    except Exception:
        pass
        
    return response.text, tokens


def _clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def _call_llm_with_retry(prompt: str) -> Tuple[str, Dict]:
    """
    Try Gemini first (with retries), fall back to Ollama on full failure.
    Returns (raw_text, metrics).
    """
    from services.observability import record_gemini_call
    
    metrics: Dict[str, Any] = {
        "provider": "gemini",
        "retries": 0,
        "fallback_used": False,
        "latency": 0.0,
        "status": "success",
    }
    t0 = time.perf_counter()

    for attempt in range(MAX_RETRIES + 1):
        try:
            start_attempt = time.perf_counter()
            text, tokens = await _call_gemini(prompt)
            latency = time.perf_counter() - start_attempt
            
            # Record success metric
            record_gemini_call(path="generation", latency_ms=latency*1000, tokens_used=tokens, success=True)
            
            metrics["latency"] = time.perf_counter() - t0
            return _clean_json_text(text), metrics
        except Exception as exc:
            latency = time.perf_counter() - t0
            # Record failure metric
            record_gemini_call(path="generation", latency_ms=latency*1000, success=False)
            
            logger.warning(
                "gemini_attempt_failed",
                extra={"attempt": attempt + 1, "error": str(exc)},
            )
            metrics["retries"] += 1
            if attempt < MAX_RETRIES:
                await asyncio.sleep(1.5 * (attempt + 1))

    # Ollama fallback
    try:
        logger.info("ollama_fallback_activated")
        metrics["provider"] = "ollama"
        metrics["fallback_used"] = True
        text = await _call_ollama(prompt)
        metrics["latency"] = time.perf_counter() - t0
        return _clean_json_text(text), metrics
    except Exception as exc:
        logger.error("ollama_fallback_failed", extra={"error": str(exc)})
        metrics["status"] = "failed"
        metrics["latency"] = time.perf_counter() - t0
        empty = json.dumps({"answer": "I could not find this information in the provided documents.", "citations": []})
        return empty, metrics


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_grounded_prompt(
    query: str,
    context_blocks: List[Dict],  # list of {source_id, text, page, section}
    history: Optional[List[Dict]] = None,
) -> str:
    """
    Build the strict grounded generation prompt.
    history: list of {"role": "user"|"assistant", "content": str}
    """
    context_str = ""
    for block in context_blocks:
        src = block["source_id"]
        page = f" [Page {block['page']}]" if block.get("page") else ""
        sec  = f" [{block['section']}]"   if block.get("section") else ""
        context_str += f"\n--- [SOURCE:{src}{page}{sec}] ---\n{block['text']}\n"

    history_str = ""
    if history:
        for msg in history[-6:]:    # last 3 turns
            role = "User" if msg["role"] == "user" else "Assistant"
            history_str += f"\n{role}: {msg['content']}"
        history_str = f"\nCONVERSATION HISTORY:{history_str}\n"

    return f"""You are an expert AI Document Intelligence assistant.
Your role is to answer the user's question using ONLY the provided source documents.

CONTEXT DOCUMENTS:
{context_str.strip()}
{history_str}
USER QUESTION:
{query}

CRITICAL RULES:
1. ONLY use information explicitly present in the CONTEXT DOCUMENTS above.
2. CITE every factual claim inline using [SOURCE:<id>] format immediately after the claim.
3. If the answer cannot be found in the documents, respond EXACTLY:
   {{"answer": "I could not find this information in the provided documents.", "citations": []}}
4. Combine information from multiple sources when relevant.
5. Never guess, infer, or use external knowledge.
6. Be concise and direct. Avoid padding or repetition.

Respond STRICTLY as a JSON object with these fields:
{{
  "answer": "<your answer with inline [SOURCE:id] citations>",
  "citations": ["<source_id_1>", "<source_id_2>", ...]
}}"""


# ══════════════════════════════════════════════════════════════════════════════
# VERIFICATION LAYER
# ══════════════════════════════════════════════════════════════════════════════

def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _verify_answer(
    answer_text: str,
    context_blocks: List[Dict],
) -> Tuple[float, str]:
    """
    Deterministic verification: check how many sentences in the answer
    are supported by at least one source chunk (Jaccard threshold).

    Returns (confidence: 0–1, support_status).
    """
    SUPPORT_THRESHOLD = 0.12    # lenient — multi-chunk synthesis lowers per-sentence overlap

    # Split answer into sentences
    sentences = re.split(r"(?<=[.!?])\s+", answer_text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

    if not sentences:
        return 0.0, "ungrounded"

    # Check sentences that contain a citation marker → these are likely supported
    citation_pattern = re.compile(r"\[SOURCE:[^\]]+\]")
    source_texts = [b["text"] for b in context_blocks]

    supported = 0
    for sentence in sentences:
        # If sentence has an inline citation, check overlap with any source
        has_citation = bool(citation_pattern.search(sentence))
        clean = citation_pattern.sub("", sentence).strip()
        backed_by_source = any(_jaccard(clean, st) >= SUPPORT_THRESHOLD for st in source_texts)
        if has_citation or backed_by_source:
            supported += 1

    confidence = round(supported / len(sentences), 3)

    if confidence >= 0.85:
        support_status = "fully_supported"
    elif confidence >= 0.4:
        support_status = "partially_supported"
    else:
        support_status = "ungrounded"

    return confidence, support_status


# ══════════════════════════════════════════════════════════════════════════════
# MAIN GENERATION FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

async def generate_grounded_answer(
    *,
    query: str,
    chunks,                                 # List[RetrievedChunk] from retrieval.py
    conversation_history: Optional[List[Dict]] = None,
) -> Dict:
    """
    Generate a grounded answer from retrieved chunks.

    Returns a dict matching models.schemas.RAGAnswerResponse fields:
      answer, citations, confidence, support_status, latency_ms
    """
    from models.schemas import CitationSource

    t0 = time.perf_counter()

    if not chunks:
        return {
            "answer": "I could not find this information in the provided documents.",
            "citations": [],
            "confidence": 0.0,
            "support_status": "no_context",
            "latency_ms": 0.0,
        }

    # ── Build context blocks ───────────────────────────────────────────────────
    context_blocks: List[Dict] = []
    source_map: Dict[str, Dict] = {}   # source_id → chunk metadata

    for chunk in chunks:
        source_id = f"{chunk.document_id[:8]}_{chunk.chunk_index}"
        context_blocks.append(
            {
                "source_id": source_id,
                "text": chunk.text,
                "page": chunk.page_number,
                "section": chunk.section_title,
            }
        )
        source_map[source_id] = chunk

    # ── Build prompt ───────────────────────────────────────────────────────────
    prompt = _build_grounded_prompt(query, context_blocks, conversation_history)

    # ── Call LLM ───────────────────────────────────────────────────────────────
    raw_text, llm_metrics = await _call_llm_with_retry_internal(prompt)

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error("generation_json_parse_error", extra={"raw": raw_text[:200]})
        result = {
            "answer": "I could not find this information in the provided documents.",
            "citations": [],
        }

    answer_text = result.get("answer", "")
    cited_ids   = result.get("citations", [])

    # ── Verification ───────────────────────────────────────────────────────────
    confidence, support_status = _verify_answer(answer_text, context_blocks)

    # Override: if model said no info, treat as no_context
    if "could not find" in answer_text.lower():
        support_status = "no_context"
        confidence = 0.0

    # ── Build citation objects ─────────────────────────────────────────────────
    citations: List[Dict] = []
    for cid in cited_ids:
        if cid in source_map:
            chunk = source_map[cid]
            citations.append(
                {
                    "document_id": chunk.document_id,
                    "filename": chunk.filename,
                    "page_number": chunk.page_number,
                    "section_title": chunk.section_title,
                    "chunk_text": chunk.text[:300],
                }
            )

    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    logger.info(
        "generation_complete",
        extra={
            "confidence": confidence,
            "support_status": support_status,
            "citations": len(citations),
            "latency_ms": latency_ms,
            "provider": llm_metrics.get("provider", "unknown"),
        },
    )

    return {
        "answer": answer_text,
        "citations": citations,
        "confidence": confidence,
        "support_status": support_status,
        "latency_ms": latency_ms,
    }


# ══════════════════════════════════════════════════════════════════════════════
# LEGACY: talent-matching generation (preserved)
# ══════════════════════════════════════════════════════════════════════════════

async def generate_rag_answer(
    query: str,
    chunks: List[str],
    metadata: List[Dict],
) -> Tuple[Dict, Dict]:
    """Legacy adapter used by evaluate_generation.py and old insights endpoint."""
    from dataclasses import dataclass

    @dataclass
    class _FakeChunk:
        document_id: str
        collection_id: str = ""
        workspace_id:  str = ""
        filename:      str = ""
        text:          str = ""
        page_number:   int = None
        section_title: str = None
        parent_chunk_index: int = None
        chunk_index:   int = 0
        score:         float = 1.0

    fake_chunks = []
    for text, meta in zip(chunks, metadata):
        fake_chunks.append(
            _FakeChunk(
                document_id=meta.get("resume_id", meta.get("job_id", "doc")),
                filename=meta.get("resume_id", meta.get("job_id", "doc")),
                text=text,
            )
        )

    result = await generate_grounded_answer(query=query, chunks=fake_chunks)
    metrics = {"latency": result["latency_ms"] / 1000, "status": result["support_status"]}
    return {"answer": result["answer"], "citations": result["citations"]}, metrics


_call_llm_with_retry_internal = _call_llm_with_retry

# Legacy caller from matcher.py
async def _call_llm_with_retry_legacy(prompt: str, **kwargs) -> Dict:
    text, metrics = await _call_llm_with_retry_internal(prompt)
    return {"text": text, "metrics": metrics}

# Expose legacy alias
_call_llm_with_retry = _call_llm_with_retry_legacy
