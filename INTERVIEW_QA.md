# TalentAI — Interview Preparation Q&A

50+ curated interview questions with strong model answers, covering every technical layer of the stack.

---

## Architecture & System Design

**Q1. Walk me through the high-level architecture of TalentAI.**

> TalentAI is a three-tier web application. The frontend is a React SPA that communicates with a FastAPI async backend over REST using JWT Bearer tokens. The backend follows a router → dependency injection → service layer → data layer pattern. The data layer consists of MongoDB as the primary store (accessed via Motor, the async driver), and ChromaDB as the vector store for semantic embeddings. AI reasoning is handled by Google Gemini 2.5 Flash. Middleware handles cross-cutting concerns: security headers, rate limiting, request tracing, and CORS — all before a request reaches any business logic.

---

**Q2. Why did you choose FastAPI over Django or Flask?**

> FastAPI was the right choice for three reasons. First, it's natively async, which is critical when you're making concurrent calls to MongoDB (via Motor), ChromaDB, and the Gemini API — blocking I/O would kill throughput. Second, it has automatic OpenAPI documentation generation, which was valuable for debugging during development. Third, it uses Pydantic v2 for request/response validation, which prevents NoSQL injection by strictly typing all incoming data — you can't pass raw dicts to the database.

---

**Q3. How did you design the RBAC system?**

> I defined three roles: `candidate`, `recruiter`, and `admin`. Authentication uses JWT tokens — the `sub` claim stores the user's MongoDB ObjectId. The `get_current_user` dependency fetches the full user document from MongoDB on each request, so role changes take effect immediately without token refresh. I then created role-specific dependency functions — `candidate_only`, `recruiter_only`, and `admin_only` — each of which calls `get_current_user` and checks the role field, raising HTTP 403 if the role doesn't match. These are injected into route handlers via `Depends()`.

---

**Q4. How does the middleware stack work, and why does order matter?**

> FastAPI middleware is a stack — outermost middleware runs first on the request and last on the response. My order is: Security Headers → Rate Limiting → Request Logging → CORS. Rate limiting must be inside Security Headers so rate-limited responses still get security headers. Request Logging must be inside Rate Limiting so we don't log requests that were blocked at the IP level. CORS is innermost because it needs to see the actual route handlers to set the correct Allow-Origin headers.

---

**Q5. How does the application handle startup failures gracefully?**

> The `lifespan` async context manager validates all required environment variables (MONGO_URL, JWT_SECRET, GEMINI_API_KEY) before attempting any connections. If any are missing, it raises a RuntimeError immediately — the server refuses to start. After validation, it pings MongoDB. If MongoDB is unreachable, startup fails with a structured error log. All collections and indexes are created/verified on each startup, making the application self-provisioning.

---

## FastAPI

**Q6. What is a FastAPI Dependency and how do you use them?**

> Dependencies are callables that FastAPI resolves before the route handler runs, injecting their return values as parameters. I use them extensively: `get_db` returns the MongoDB database reference, `get_current_user` returns the authenticated user document, and role-specific dependencies like `candidate_only` call `get_current_user` internally and check the role. This creates a clean, composable, and testable auth layer — each route handler just declares what it needs.

---

**Q7. How do you handle background tasks without blocking the event loop?**

> CPU-bound work like embedding generation (which runs PyTorch/sentence-transformers) can't be awaited — it would block the event loop. I use `BackgroundTasks.add_task()` to offload these to FastAPI's background task executor, and wrap the synchronous model inference in `asyncio.get_event_loop().run_in_executor(None, ...)` to run it in the thread pool. The background task also updates MongoDB when it completes, setting the resume status to "Complete" or "Failed".

---

**Q8. How do you prevent NoSQL injection in FastAPI?**

> The `UserUpdateRequest` schema uses Pydantic with `extra = "forbid"` — any field not explicitly defined in the schema raises a validation error. Route handlers accept typed Pydantic models, not raw dicts. The only data reaching MongoDB is what Pydantic has already validated against strict field definitions, preventing attackers from injecting arbitrary operators like `$where` or `$regex`.

---

**Q9. How does the global exception handler work?**

> I registered a custom `@app.exception_handler(Exception)` that catches any unhandled exception. It logs the error with structured context (request ID, path, error message), records the error to the observability system, and returns a clean JSON response with a 500 status. The response includes the `X-Request-ID` header so operations teams can correlate the frontend-visible error with the exact log entry.

---

**Q10. How do you handle rate limiting without Redis?**

> I implemented an in-memory rate limiter as ASGI middleware. It maintains a per-IP counter and timestamp using a Python dict. The auth endpoints have a stricter 10 req/min limit vs the default 60 req/min. When a limit is exceeded, it returns HTTP 429 with a `Retry-After` header. The tradeoff is that this doesn't work across multiple backend instances — in a scaled deployment, you'd replace this with a Redis-backed counter.

---

## MongoDB & Motor

**Q11. Why did you choose MongoDB over a relational database?**

> Resume and job data are inherently schema-flexible — every resume has a different structure, skill sets vary wildly, and AI analysis responses are nested JSON objects. Trying to normalize these into relational tables would require complex joins and frequent schema migrations. MongoDB lets me store the full Gemini response as a nested document in the application record and query against it efficiently. For structured data like users and applications, I still use consistent schemas enforced by Pydantic.

---

**Q12. Walk me through your MongoDB index strategy.**

> Every query pattern has a covering index. The most important ones: `applications` has a unique compound index on `(user_id, job_id)` to enforce one application per candidate per job at the database level — not just the application layer. `jobs` has a compound index on `(status, created_at)` because the most common query is "active jobs sorted by newest." `copilot_messages` has a compound index on `(session_id, created_at)` for ordered chat history retrieval. `users` has a unique index on `email`.

---

**Q13. How does Motor differ from PyMongo?**

> Motor is the async wrapper for PyMongo. With Motor, all database operations return awaitables — `await db.users.find_one(...)` instead of `db.users.find_one(...)`. This is critical in an async FastAPI application — synchronous PyMongo calls would block the entire event loop, preventing any other requests from being processed while a DB query is running. Motor uses PyMongo under the hood but routes all I/O through asyncio.

---

**Q14. How do you handle MongoDB ObjectId serialization?**

> MongoDB uses BSON ObjectIds, which aren't JSON-serializable by default. I defined a `PyObjectId` custom Pydantic type using `BeforeValidator(str)` that converts any ObjectId to a string before validation. The `UserResponse` schema uses `Field(alias="_id")` with `populate_by_name = True`, so the MongoDB `_id` field maps to the `id` field in the API response.

---

**Q15. How would you scale MongoDB for this application?**

> For read-heavy workloads, I'd add MongoDB Atlas with replica sets — reads can be distributed across secondaries. For the matching queries that sort by `match_score`, the compound index on `(job_id, match_score)` is already in place. For write-heavy analytics, I'd move the `metrics` collection to a time-series collection in MongoDB 7 which has native compression and retention policies. For geographic distribution, Atlas Global Clusters can shard by region.

---

## ChromaDB & Embeddings

**Q16. Why ChromaDB over Pinecone or Weaviate?**

> ChromaDB is self-hosted and runs persistently on local disk — no external service, no API costs, and no data leaving the infrastructure. For a recruitment platform dealing with potentially sensitive resume data, keeping vectors on-premises is a strong privacy argument. ChromaDB also supports the `cosine` distance metric natively in its collection metadata, which is the right choice for semantic similarity where we care about direction (meaning) not magnitude (length).

---

**Q17. How does the embedding pipeline work?**

> When a resume is uploaded, the raw text is passed to `add_resume_embedding()` which calls `get_embedding()` — this runs the sentence through the `all-MiniLM-L6-v2` model (loaded once at startup via `load_model()`) and returns a 384-dimensional float vector. The vector is upserted into ChromaDB's `resumes` collection with the resume's ObjectId as the ID. When a candidate applies to a job, the job embedding is fetched similarly and cosine similarity is computed between the two vectors.

---

**Q18. Why sentence-transformers and not OpenAI embeddings?**

> `all-MiniLM-L6-v2` runs locally with zero per-call cost, is fast (CPU-friendly), and produces 384-dimensional vectors that are well-suited for semantic similarity tasks like resume-job matching. OpenAI embeddings would add API latency and per-token cost for every upload. Since embeddings are computed once per document (not per query), the latency tradeoff is acceptable and the cost savings are significant at scale.

---

**Q19. How do you handle the case where a user has no embedding yet?**

> The `get_resume_embedding` function catches the case where ChromaDB returns an empty result and raises a `ValueError("Resume embedding not found")`. The route handler catches this and returns a graceful error response indicating the resume is still processing. The UI shows a "Processing" status badge — the background task updates MongoDB to "Complete" when the embedding is done.

---

**Q20. What is cosine similarity and why is it the right metric here?**

> Cosine similarity measures the angle between two vectors in high-dimensional space — ignoring their magnitudes and only caring about their direction. For semantic embeddings, two sentences with similar meaning will point in similar directions even if they have different lengths. In recruitment, a 3-page resume and a 1-paragraph job description will have vastly different word counts but similar semantic vectors if they describe the same skills. Cosine similarity handles this correctly; Euclidean distance would not.

---

## Gemini AI Integration

**Q21. How do you call Gemini from Python and handle errors?**

> I use the `google-generativeai` SDK with lazy initialization — `get_gemini_model()` only configures `genai` with the API key if called, avoiding startup cost if the key is absent. All Gemini calls are wrapped in try/except with a `MAX_RETRIES = 2` retry loop for transient failures. The function returns the raw text response, and JSON parsing is done with a fallback — if Gemini's response isn't valid JSON, I attempt a regex extraction of the JSON block before returning a structured error.

---

**Q22. How do you prompt Gemini for structured output?**

> I use explicit JSON schemas in the prompt itself — e.g., "Respond ONLY with valid JSON in this exact format: `{skills: [], experience: [], ...}`." The generation call uses `response_mime_type="application/json"` where supported. After receiving the response, I parse it with `json.loads()` and validate the structure. If the response is malformed, the service falls back to a default structured response rather than propagating an error to the user.

---

**Q23. What is the Copilot's context window strategy?**

> The Copilot exploits Gemini 2.5 Flash's 1 million token context window. Rather than chunking, I load the entire resume text, the full job description, and the complete AI match analysis into the system prompt. This gives Gemini complete, untruncated context — no retrieval augmentation needed. Conversation history is maintained in an in-process LRU dict capped at 500 sessions and 20 turns each, with Redis as an optional upgrade path.

---

**Q24. How do you track Gemini API costs?**

> The `observability.py` service has a `record_gemini_call()` function that stores the token count for each inference. Cost estimation uses the public Gemini Flash pricing: $0.075/M input tokens + $0.30/M output tokens. The `get_dashboard_stats()` aggregation pipeline sums token counts from the metrics collection over a configurable time window and multiplies by the rate constants. The Admin Dashboard displays estimated spend in real-time.

---

**Q25. How would you handle Gemini rate limits in production?**

> I'd implement an exponential backoff retry with jitter (already partially in place with `MAX_RETRIES`). For sustained high-throughput, I'd add a token bucket rate limiter that tracks requests per minute against the Gemini quota. Long-running AI operations (like bulk reprocessing) are already in background tasks — I'd add a per-minute job concurrency cap there. For cost control, caching identical prompts in Redis with a TTL would eliminate redundant API calls for repeated operations.

---

## Redis & Caching

**Q26. How is Redis used in TalentAI?**

> Redis is an optional layer — the application degrades gracefully to an in-process LRU cache if Redis is unavailable. When Redis is present, it's used for: (1) Copilot session history — persisted across server restarts and shared across instances; (2) RAG query cache — identical queries return cached results for a TTL period; (3) Workspace version hashing — cache keys are rotated when AI versions are bumped to force cache invalidation.

---

**Q27. How does cache invalidation work?**

> Versioning-based invalidation: when an admin bumps an AI version (e.g., the embedding model version), `versioning.py` generates a new workspace version hash. All cache keys include this hash as a prefix — old keys become unreachable and expire via TTL. This means you never have to manually invalidate individual cache entries when the model changes; bumping the version handles it automatically.

---

## Security

**Q28. How is the JWT token validated on each request?**

> The `OAuth2PasswordBearer` scheme extracts the token from the `Authorization: Bearer` header. `get_current_user()` calls `jwt.decode()` with the `JWT_SECRET` and the `HS256` algorithm — any tampering with the token payload causes a signature verification failure and raises HTTP 401. The `sub` claim (user_id) is used to fetch the current user document from MongoDB, ensuring the token maps to a real, active user.

---

**Q29. What security headers do you send?**

> The `SecurityHeadersMiddleware` adds: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` (HSTS) in production mode. These prevent common web vulnerabilities: clickjacking (DENY frames), MIME sniffing attacks, reflected XSS, and man-in-the-middle downgrade attacks.

---

**Q30. How do you prevent a recruiter from accessing admin endpoints?**

> The `admin_only` dependency calls `get_current_user()` and checks `role == "admin"` — if not, it raises HTTP 403. This check happens at the dependency injection layer, before any route handler code runs. There is no fallback path. A recruiter cannot escalate their own role because the only endpoint to change roles is `PUT /api/admin/users/{id}/role`, which itself requires `admin_only`.

---

**Q31. How do you store passwords securely?**

> I use `passlib` with `bcrypt` (cost factor 12). The raw password is hashed on registration and the hash is stored in MongoDB. The raw password is never persisted. Verification uses `verify_password()` which calls `bcrypt.verify()` — constant-time comparison that prevents timing attacks. The login endpoint also has a stricter rate limit (10/min) to mitigate brute force.

---

## React Frontend

**Q32. How does AuthContext work?**

> `AuthContext` stores the JWT token in localStorage and decodes it on app load using `jwt-decode` to extract the user's ID and role. It provides `login()`, `logout()`, and `user` object to all components via React Context. The `ProtectedRoute` component reads `user` from context — if null, it redirects to the login page; if the role doesn't match `allowedRoles`, it redirects to the user's home page.

---

**Q33. How does the Axios interceptor work?**

> The central `api` Axios instance has a request interceptor that reads the token from localStorage and attaches `Authorization: Bearer <token>` to every outgoing request automatically. This means individual components never need to handle auth headers — they just call `api.get('/endpoint')` and the token is included. A response interceptor handles 401 responses by clearing the token and redirecting to login.

---

**Q34. How do you handle loading states and errors in the UI?**

> Each data-fetching component maintains local `loading` and `error` state booleans. While loading, Skeleton components (CSS-animated placeholder divs) are rendered in place of the actual content. On error, inline error banners are shown with the error message from the API response. I use `try/finally` in async functions to ensure `setLoading(false)` is called even when an error occurs.

---

## Scaling & Production

**Q35. How would you scale TalentAI to handle 10,000 concurrent users?**

> Horizontally scale the FastAPI backend behind a load balancer (nginx or AWS ALB). Since the application is stateless (JWT auth, no server-side sessions), any instance can handle any request. Move rate limiting from in-memory to Redis so limits are shared across instances. Use MongoDB Atlas with a replica set for read distribution. For the embedding model, either replicate it across instances or move to a dedicated inference service. Use a CDN for the React static assets.

---

**Q36. What would you change if you were building this for production at Google-scale?**

> Replace ChromaDB with Qdrant (which is already partially designed for in the retrieval service) for production-grade vector search with horizontal scaling. Move the Gemini calls to a dedicated worker service with a queue (e.g., Celery + Redis) to handle burst traffic. Add proper distributed tracing (Jaeger/Tempo) instead of just structured logs. Migrate from JWT-only auth to OAuth 2.0 with refresh tokens. Add a read replica for analytics queries to avoid impacting the primary DB.

---

**Q37. How do you handle the embedding model in a containerized environment?**

> The `all-MiniLM-L6-v2` model is downloaded from Hugging Face on first run and cached in a Docker volume. The Dockerfile copies `requirements.txt` and runs `pip install` before copying the application code, so model installation is cached in a Docker layer and doesn't re-download on every code change. In production, I'd pre-bake the model into the Docker image to eliminate the cold-start download.

---

**Q38. How does Docker Compose orchestrate the services?**

> The `docker-compose.yml` defines three services: `mongo`, `backend`, and `frontend`. The backend depends on `mongo` with a `service_healthy` condition — it won't start until MongoDB passes its `mongosh ping` health check. The frontend depends on backend being healthy. Both `mongo_data` and `chroma_data` are named volumes that persist across container restarts. The services communicate over a private `talentai-net` bridge network; MongoDB is not exposed to the host.

---

**Q39. How would you add monitoring/alerting in production?**

> Connect the existing OpenTelemetry SDK to a Jaeger or Tempo backend for distributed tracing. Export the metrics collection to Prometheus via a scrape endpoint. Build Grafana dashboards on top of Prometheus. Set alerts on: error rate > 5%, P95 latency > 2s, Gemini estimated daily spend > threshold, and MongoDB connection pool exhaustion. Add PagerDuty integration for on-call alerting.

---

**Q40. How would you implement multitenancy?**

> Add an `organization_id` field to all collections. Index every collection on `organization_id` as the first component of every compound index. The `get_current_user` dependency would populate `organization_id` from the JWT. All queries would include `{"organization_id": current_user["organization_id"]}` as a mandatory filter — enforced at the service layer, not the route layer. This prevents any cross-organization data leakage.

---

## General Engineering

**Q41. What was the hardest bug you fixed in this project?**

> The silent "Processing" state bug — resumes were permanently stuck with `status: "Processing"` in the database. The background task `process_resume_background` was running successfully but never updating the status. I traced it to the fact that background tasks in FastAPI don't share the same database dependency lifecycle as route handlers — the Motor client object needed to be explicitly passed into the background function rather than relying on the FastAPI dependency injection system.

---

**Q42. How do you handle partial failures in a multi-step AI pipeline?**

> Each pipeline step is wrapped in try/except at the service layer. If Gemini fails during matching, the application record still gets created with `match_score: null` and `ai_analysis: null` — the record isn't lost. The UI shows "Analysis pending" for null scores. For the background embedding task, failure updates the resume status to "Failed" so the user can re-upload. This is the "fail visible" pattern — never silently swallow errors.

---

**Q43. What's the difference between async and threading and when would you use each?**

> Async (asyncio) is for I/O-bound concurrency — waiting for a database response or HTTP request. You use `await` to yield control to the event loop while waiting, allowing other coroutines to run. Threading is for CPU-bound work — when you have actual computation (not waiting). I use async for all MongoDB and API calls, but run `sentence-transformers` (which does matrix multiplication in PyTorch) in a thread executor via `run_in_executor` to avoid blocking the event loop.

---

**Q44. How did you approach testing in this project?**

> I wrote integration tests using `pytest` with `httpx.AsyncClient` as the test client, avoiding mocks for the core behavior tests. The tests cover the auth flow end-to-end — register → login → access protected route. For production readiness, I'd add: unit tests for `matcher.py` cosine similarity logic, mock-based tests for Gemini calls (to avoid API costs in CI), and a property-based test for the RBAC layer verifying that no candidate or recruiter path reaches an admin endpoint.

---

**Q45. What would you do differently if you started over?**

> I'd design the observability layer first, not last. Adding structured logging and metrics tracking after the fact required touching many files. Starting with an `emit_event()` function that's wired in from day one would have been cleaner. I'd also use Qdrant from day one instead of ChromaDB — the retrieval service already has Qdrant typed code from the original design but we ended up using ChromaDB, creating some orphaned code that should have been cleaned up.

---

**Q46. How do you ensure the AI analysis doesn't hallucinate in hiring decisions?**

> Prompt engineering defensively: all recruiter intelligence prompts explicitly instruct Gemini to "only use information present in the provided resume and job description — do not infer or assume information not stated." The response schema includes a `confidence` field — responses with low confidence are surfaced to the recruiter with a disclaimer. For scorecards, the questions are generated from the explicit skills in the job description, grounding them in real requirements.

---

**Q47. How does the versioning system work?**

> The `ai_versions` MongoDB collection stores version strings for each AI component: `parser_version`, `embedding_version`, `analysis_version`, `copilot_version`, `model_version`. When an admin bumps a version via the Admin Dashboard, the new version is persisted and a workspace version hash is recomputed. This hash is prepended to all cache keys, effectively invalidating stale cached AI responses. The system can then trigger bulk reprocessing jobs to recompute all analyses with the new version.

---

**Q48. What does the reprocessing system do?**

> When an AI model is upgraded (e.g., the analysis version is bumped), all existing `applications` documents have stale `ai_analysis`. The reprocessing system triggers a background job that iterates through all documents of the specified type, re-runs the AI pipeline, and updates each record. Progress is tracked in the `reprocessing_jobs` collection with `processed` / `total` counts, visible in real-time on the Admin Dashboard.

---

**Q49. How would you add real-time features like live notifications?**

> Replace the current 30-second polling interval in `Layout.jsx` with a WebSocket connection. FastAPI natively supports WebSockets. The backend would maintain a connection registry keyed by user_id. When an application status changes or a new notification is created, the relevant user's WebSocket connection receives an immediate push event. This would reduce notification latency from up to 30 seconds to near-instant and eliminate unnecessary polling traffic.

---

**Q50. How would you implement a proper audit trail for admin actions?**

> Add an `audit_log` MongoDB collection. Every admin action (user status change, role change, version bump, reprocessing trigger) would call an `audit_log.insert_one()` with: `admin_user_id`, `action_type`, `target_id`, `before_value`, `after_value`, and `timestamp`. This creates an immutable record of all administrative changes — critical for compliance and for debugging production incidents. Query the audit log by admin user or by target entity.
