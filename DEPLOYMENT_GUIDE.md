# TalentAI Deployment Guide

## Prerequisites
- Docker & Docker Compose
- MongoDB Atlas (or local Docker container)
- Redis Cloud (or local Docker container)
- Gemini API Key

## Environment Setup
1. Copy `.env.template` to `.env.production` in both `frontend/` and `backend/`.
2. Fill in the production values (e.g. `MONGO_URL`, `JWT_SECRET`, `GEMINI_API_KEY`).

## Building & Starting
Run the following command from the root directory:
```bash
docker-compose up --build -d
```

## Validation
- Check backend health: `curl http://localhost:8000/health`
- Check frontend status: `curl http://localhost:5173` (or the mapped port)

## Architecture
- Backend is a FastAPI service powered by `uvicorn` and `gunicorn`.
- Frontend is a Vite-built React app served by `nginx`.
- Redis is used for rate limiting and caching.
- MongoDB is the primary datastore.
