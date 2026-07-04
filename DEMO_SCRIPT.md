# TalentAI — Demo Script

Three versions of the demo — pick based on your time slot and audience.

---

## 3-Minute Demo (Recruiter/Hiring Manager Audience)

**Goal:** Show the end-to-end value proposition in the shortest possible time.

---

### [0:00–0:20] Opening Hook

*Start on the landing page.*

> "Most companies still use keyword-matching ATS systems — a strong candidate gets rejected because their resume says 'built ML models' instead of 'machine learning.' TalentAI replaces that with semantic AI understanding. Let me show you how it works for both sides of the hiring funnel."

---

### [0:20–0:50] Candidate Flow

*Log in as a Candidate.*

> "A candidate signs up, uploads their resume — PDF or Word doc — and within seconds, Gemini AI has extracted their skills, experience, education, and location into structured data."

*Navigate to Find Jobs.*

> "They browse open roles. When they apply, TalentAI computes a semantic match score — not keyword overlap, but actual contextual similarity between their background and the job requirements."

---

### [0:50–1:30] Recruiter Flow

*Log in as a Recruiter → Applicant Management.*

> "The recruiter opens their applicant pipeline. Candidates are already ranked by AI match score. They can click any candidate to see the AI's reasoning — strengths, gaps, recommendations — without reading the full resume."

*Click Hiring Recommendation.*

> "One click — Gemini generates a structured hire/hold/reject recommendation with detailed reasoning. Interview scorecard, 10 custom questions per role, generated automatically."

---

### [1:30–2:00] AI Copilot

*Open Recruiter Copilot.*

> "Both sides have a conversational AI copilot. The recruiter can ask: 'Compare candidates A and B for this backend role.' The copilot has full context — resume, job description, match analysis — and gives grounded answers, not hallucinations."

---

### [2:00–2:30] Admin & Observability

*Log in as Admin.*

> "Admins see real-time platform metrics: API traffic, Gemini token usage, estimated spend, error rates. They can manage users, disable accounts, change roles, and trigger system-wide AI reprocessing when model versions are updated."

---

### [2:30–3:00] Close

> "The entire platform is containerized with Docker Compose, runs in production with rate limiting, security headers, and structured logging. Built in Python FastAPI, React, MongoDB, ChromaDB, and Gemini 2.5 Flash. Any questions?"

---
---

## 5-Minute Demo (Technical Interviewer / Engineering Manager)

**Goal:** Cover the full candidate and recruiter flow while touching architecture decisions.

---

### [0:00–0:30] Context Setting

> "TalentAI is a full-stack AI recruitment platform I built to demonstrate production-grade Python backend design, AI integration, and vector search. The backend is FastAPI with async MongoDB via Motor, ChromaDB for embeddings, and Gemini 2.5 Flash for all AI reasoning. Let me walk you through the live system."

---

### [0:30–1:30] Candidate Flow

*Register as Candidate → Upload Resume.*

> "On upload, the file goes to `parser.py` which uses pdfplumber for PDF extraction. The raw text is passed to Gemini with a strict JSON schema prompt — the API returns structured data: skills, experience, education, location. This is stored in MongoDB with status 'Processing'."

> "Simultaneously, a FastAPI BackgroundTask runs sentence-transformers to generate a 384-dimensional embedding vector and upsert it into ChromaDB's `resumes` collection. When done, MongoDB status is updated to 'Complete' — the UI reflects this in real-time."

*Apply to a Job.*

> "When applying, the system fetches both the resume embedding and the job embedding from ChromaDB, computes cosine similarity for the raw score, then sends the full resume + job description to Gemini for structured analysis: strengths, gaps, recommendations. Everything is stored in the applications collection."

---

### [1:30–2:30] AI Features

*Open AI Copilot as Candidate.*

> "The copilot loads the candidate's full resume text and the job description into Gemini's system prompt — no RAG chunking needed because Gemini 2.5 Flash has a 1M token window. Conversation history is maintained in an in-process LRU dict with Redis as a fallback. The response includes 3 AI-generated follow-up suggestion chips."

*Open Resume Optimizer.*

> "The optimizer sends resume text + job description to Gemini with a targeted prompt that returns specific, actionable suggestions for improving alignment — phrasing changes, missing keywords, skills to highlight."

---

### [2:30–3:30] Recruiter Intelligence

*Log in as Recruiter → Applicants.*

> "Recruiters see their pipeline ranked by match score. The `rank_candidates` endpoint fetches all applications for a job, sorts them, and returns them with enriched candidate data — all from MongoDB with a compound index on `(job_id, match_score)`."

*Click Hiring Recommendation → Scorecard → Explanation.*

> "Three separate Gemini calls via `recruiter_intelligence.py` — each returns a different structured response. The recommendation returns `decision`, `reasoning`, `strengths`, `concerns`. The scorecard returns 10 interview questions with expected answer criteria. The explanation returns a plain-language ranking rationale."

---

### [3:30–4:15] Architecture & Security

> "The backend has a 4-layer middleware stack: SecurityHeadersMiddleware adds HSTS and X-Frame-Options; RateLimitMiddleware enforces 60 req/min default and 10 req/min on auth endpoints; RequestLoggingMiddleware generates X-Request-ID for tracing; CORS restricts origins to the configured allowlist."

> "RBAC is implemented as FastAPI Depends: `candidate_only`, `recruiter_only`, and `admin_only` functions each call `get_current_user()` and check the role field — raising 403 if mismatched. Role changes take effect immediately since the user document is fetched from MongoDB on every request."

---

### [4:15–5:00] Admin + Close

*Admin Dashboard → Metrics Tab → User Management.*

> "The Admin Dashboard pulls from a MongoDB aggregation pipeline in observability.py — summing request counts, error rates, Gemini token usage, and computing P95 latency. User management calls `find_one_and_update` with `return_document=True` to atomically update and return the modified document."

> "The whole stack is Dockerized — backend depends on mongo with a service_healthy condition. Everything self-provisions on startup: collections created, indexes ensured, embedding model loaded. Questions?"

---
---

## 10-Minute Technical Walkthrough (For Tech Leads / Architects)

**Goal:** Deep dive into every architectural decision with code-level context.

---

### [0:00–1:00] System Architecture Overview

> "Let me start with the high-level architecture."

*Draw or show the architecture diagram from ARCHITECTURE.md.*

> "React SPA → FastAPI REST → Service Layer → {MongoDB, ChromaDB, Gemini}. FastAPI was chosen for its native async support — critical when you're making concurrent I/O calls to Motor (async MongoDB), ChromaDB, and the Gemini HTTP client. No blocking I/O anywhere in the hot path."

> "The middleware stack runs before any business logic: security headers, IP-based rate limiting (in-memory dict, Redis-upgradable), structured JSON logging with X-Request-ID correlation, and CORS. Order matters — rate-limited responses still get security headers because Security is outermost."

---

### [1:00–2:30] Resume Parsing & Embedding Pipeline

*Show `parser.py` → `routes.py` upload_resume → `embedding.py`.*

> "The upload route is async. File bytes are read with `await file.read()`. `parse_resume()` is synchronous (pdfplumber is not async-aware) — I call it directly since it's CPU-light text extraction, not I/O. The structured Gemini extraction IS awaited — it's an HTTP call. The result is inserted into MongoDB immediately so the user gets a response fast."

> "The embedding is offloaded to `BackgroundTasks` with `process_resume_background()`. Inside that function, sentence-transformers runs in `run_in_executor(None, ...)` — this puts it in the thread pool, preventing the PyTorch matrix multiplication from blocking the event loop. The task then does an async `await db.resumes.update_one()` to set the status. This is why the background function accepts `db` as a parameter — FastAPI dependency injection doesn't apply to background tasks."

---

### [2:30–4:00] Matching Pipeline

*Show `matcher.py` and the apply_to_job route.*

> "The match score is cosine similarity between resume and job vectors from ChromaDB. Cosine is right here because we care about semantic direction, not vector magnitude. A 3-page detailed resume and a 1-paragraph job description have similar semantic vectors if they describe the same work — Euclidean distance would penalize the length difference."

> "After the cosine score, we call Gemini with the full resume text and full job description — not a summary. This grounds the AI analysis in actual content. The prompt enforces a strict JSON schema response: `{strengths, gaps, recommendations, match_explanation}`. The application record stores both the numeric score and the AI analysis document — making it queryable and AI-enrichable."

---

### [4:00–5:30] Copilot Architecture

*Show `copilot.py`.*

> "The copilot is intentionally NOT a RAG system. Resume text + job description fit comfortably in Gemini 2.5 Flash's 1M token window — typically 5-15K tokens. Chunking, retrieving, and reranking would add 200-500ms of latency and complexity for no quality benefit at this context scale. The full context loads in one shot."

> "Conversation history is maintained in `_LRUSessionStore` — an `OrderedDict`-based LRU dict capped at 500 sessions and 20 turns (40 messages). It's thread-safe through the GIL in Python. When Redis is present, I serialize the history to JSON and push/pop from a Redis list — this survives restarts and works across multiple backend instances."

> "Each Copilot response includes 3 AI-generated follow-up suggestion chips. These are generated in the same Gemini call as the main answer — the prompt asks for `{answer, suggestions: [3]}`. This adds zero latency while dramatically improving UX."

---

### [5:30–7:00] RBAC & Security Deep Dive

*Show `auth.py`.*

> "JWT validation uses `python-jose` with HS256 and the `JWT_SECRET` env variable. The `get_current_user` dependency decodes the token, extracts `sub` (user_id), and does a MongoDB `find_one` on every request. This is intentionally not cached — a user whose account is disabled immediately loses access on the next request without waiting for token expiry."

> "Role dependencies chain: `admin_only` calls `get_current_user` internally and checks `role == 'admin'`. There's no bypass path — no X-Admin-Key fallback like the old `verify_admin` function had. The old implementation was a zero-trust failure: recruiters could pass an X-Admin-Key header and access admin endpoints. I removed that entirely."

> "Pydantic schemas use `extra = 'forbid'` on all update schemas. This prevents NoSQL injection — an attacker can't send `{email: {$ne: ''}}` as a payload because Pydantic rejects any field not explicitly defined in the schema."

---

### [7:00–8:30] MongoDB Schema & Indexing Strategy

*Show main.py startup indexes.*

> "I create all indexes at startup via Motor — no manual migrations needed. The most important compound index is `applications (user_id, job_id)` with `unique=True`. This enforces one-application-per-candidate-per-job at the database level, not the application level — preventing race conditions if two requests hit simultaneously."

> "For the candidate pipeline query — 'give me all applications for job X sorted by match score' — the compound index `(job_id, match_score)` is the covering index. MongoDB doesn't need to touch the document data at all; the entire sort operation runs in the index. For filtered job listings — active jobs sorted by newest — the `(status, created_at)` index covers the query."

---

### [8:30–9:30] Observability & Admin Architecture

*Show `observability.py` and Admin Dashboard.*

> "The observability service uses a dual approach: in-memory counters for high-frequency metrics (request count, error count) that are flushed to MongoDB every 30 seconds, and direct-to-MongoDB writes for discrete events (registrations, logins, AI calls). The `get_dashboard_stats()` function runs a MongoDB aggregation pipeline — `$match → $group → $sort` — to compute timeseries buckets, endpoint statistics, and Gemini token sums without loading raw documents into Python."

> "Gemini cost estimation: `total_estimated_cost = (input_tokens / 1_000_000 * 0.075) + (output_tokens / 1_000_000 * 0.30)`. These are the actual published Gemini Flash pricing rates. The Admin Dashboard shows this in real-time — giving visibility into AI spend before it becomes a surprise on the API bill."

---

### [9:30–10:00] Production Readiness & Close

> "The Docker Compose setup uses service health checks — the backend won't start until MongoDB passes `mongosh ping`. The backend Dockerfile uses a multi-stage-like pattern: dependencies are installed before code is copied, so the pip install layer is cached. CHROMA_DATA is a named volume so embeddings survive container restarts."

> "For the next production step: swap ChromaDB for Qdrant (the retrieval service already has Qdrant-typed code in `retrieval.py` from an earlier design iteration), add Prometheus metrics export for Grafana dashboards, and add proper refresh tokens to the auth system. Happy to go deeper on any layer."

---

## Talking Points Cheat Sheet

| Topic | Key Point |
|-------|-----------|
| Why FastAPI | Native async, Pydantic validation, zero boilerplate RBAC |
| Why MongoDB | Flexible schema for AI output, Motor async, embedded documents |
| Why ChromaDB | Self-hosted, no data leaves infrastructure, cosine distance native |
| Why sentence-transformers | Zero cost, local inference, right size for similarity task |
| Why Gemini Flash | 1M context window eliminates RAG complexity for copilot use case |
| RBAC design | Dependency injection pattern, immediate role invalidation, no bypass |
| Background tasks | CPU work in thread executor, DB update on completion |
| Rate limiting | In-memory (upgradable to Redis), auth endpoints stricter |
| Cost tracking | Token counts → aggregation pipeline → estimated USD per timeframe |
| Admin security | Removed X-Admin-Key bypass, JWT role check only, no recruiter escalation |
