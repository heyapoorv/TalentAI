# TalentAI — Production Deployment Guide

> Target platforms: **Render**, **AWS EC2/ECS**, **DigitalOcean**, any Docker host.

---

## Final Project Structure

```
TalentAI/
├── docker-compose.yml          ← Orchestrates all 3 services
├── backend/
│   ├── Dockerfile              ← Multi-stage: builder + runtime
│   ├── .env.template           ← Copy → .env, fill secrets
│   ├── main.py                 ← App factory + all middleware
│   ├── middleware/
│   │   ├── logging_middleware.py ← JSON logs + request tracing
│   │   ├── rate_limit.py         ← Sliding-window rate limiter
│   │   └── security.py           ← OWASP security headers
│   ├── api/
│   │   ├── routes.py
│   │   └── auth_routes.py
│   ├── models/schemas.py
│   └── services/
│       ├── auth.py, parser.py, embedding.py, matcher.py
└── frontend/
    ├── Dockerfile              ← Node build → nginx serve
    ├── nginx.conf
    ├── vite.config.js          ← Chunk splitting, build optimizations
    └── src/api/axios.js        ← Env-aware, auto-logout on 401
```

---

## Quick Start (Docker)

```bash
# 1. Fill secrets
cp backend/.env.template backend/.env
# Edit GEMINI_API_KEY and JWT_SECRET_KEY in backend/.env

# 2. Build & run
docker compose up --build -d

# 3. Check health
curl http://localhost:8000/health   # {"status":"healthy","database":"connected"}
curl http://localhost/health        # {"status":"ok"}

# App is live at http://localhost
```

---

## Deploy on Render

### Backend (Web Service)
| Setting | Value |
|---|---|
| Root Dir | `backend/` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |
| Env Vars | Copy all from `.env.template` |

### Frontend (Static Site)
| Setting | Value |
|---|---|
| Root Dir | `frontend/` |
| Build Command | `npm ci && npm run build` |
| Publish Dir | `dist/` |
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` |

> **MongoDB:** Use MongoDB Atlas free tier. Set `MONGO_URL` to the Atlas connection string.

---

## Security Implemented

- [x] JWT 7-day expiry + auto-logout on 401
- [x] Bcrypt + SHA-256 password hashing
- [x] RBAC on every endpoint (`candidate_only` / `recruiter_only`)
- [x] Rate limiting — 60 req/min general, 10 req/min auth
- [x] OWASP headers (CSP, HSTS, X-Frame-Options, X-XSS-Protection)
- [x] Pydantic v2 input validation on all request bodies
- [x] MongoDB unique indexes prevent duplicate applications
- [x] Docs UI disabled when `ENVIRONMENT=production`
- [x] Non-root Docker user in both containers

---

## Performance Summary

| Layer | What Was Done |
|---|---|
| MongoDB | 15 compound indexes covering all filter/sort patterns |
| Resume AI | Offloaded to BackgroundTasks (non-blocking) |
| Job feed | Paginated (12/page), server-side filtered + sorted |
| Frontend JS | Manual chunk splitting (vendor / ui), content-hashed filenames |
| Nginx | 1-year immutable cache for assets, gzip level 6 |
| Gunicorn | 2 Uvicorn workers, 120s timeout for LLM calls |

---

## Scaling Notes

- **More CPU cores:** Change `--workers 2` to `--workers $(( 2 * $(nproc) + 1 ))`
- **Multi-instance rate limiting:** Replace in-memory dict in `rate_limit.py` with Redis
- **Vector store at scale:** Swap ChromaDB volume for Pinecone or Weaviate
