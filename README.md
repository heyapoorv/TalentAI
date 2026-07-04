<div align="center">

# 🧠 TalentAI

**AI-Powered Recruitment Intelligence Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-1.5-FF6B6B?style=flat-square)](https://www.trychroma.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com)

*A full-stack, production-grade recruitment platform with semantic matching, recruiter intelligence, AI copilots, and admin observability — built to replace outdated keyword-based ATS systems.*

[Features](#-core-features) · [Architecture](#-architecture) · [Installation](#-installation) · [API](#-api-overview) · [Deployment](#-deployment)

</div>

---

## 🎯 Problem Statement

Traditional Applicant Tracking Systems (ATS) rely on **keyword matching** — failing both candidates and recruiters:

- ✗ Candidates with strong experience are rejected for missing exact keywords
- ✗ Recruiters spend hours manually reviewing hundreds of applications  
- ✗ No contextual understanding of skill adjacency, career trajectory, or role fit
- ✗ Zero AI assistance for interview prep, scorecard generation, or hiring decisions

**TalentAI solves this with semantic AI matching, recruiter intelligence workflows, and conversational copilots for both sides of the hiring funnel.**

---

## 💡 Solution Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                      │
│  Candidate Portal | Recruiter Portal | Admin Dashboard  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (JWT Auth)
┌────────────────────────▼────────────────────────────────┐
│              FastAPI Backend (Async Python)              │
│  Rate Limiting → Auth → RBAC → Business Logic → DB      │
├─────────────┬──────────────────────┬────────────────────┤
│  MongoDB    │     ChromaDB         │   Gemini 2.5 Flash │
│  (records)  │  (vector embeddings) │   (AI reasoning)   │
└─────────────┴──────────────────────┴────────────────────┘
```

---

## 🏗️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | SPA with role-based routing |
| **Styling** | TailwindCSS | Utility-first design system |
| **Backend** | FastAPI 0.136 | Async REST API |
| **Database** | MongoDB 7 + Motor | Primary data store (async) |
| **Vector DB** | ChromaDB 1.5 | Semantic embedding storage |
| **AI Model** | Gemini 2.5 Flash | Resume parsing, matching, copilot |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) | Dense vector generation |
| **Auth** | JWT (python-jose) + bcrypt | Stateless auth + password hashing |
| **Observability** | Custom metrics + OpenTelemetry | Request tracing, cost tracking |
| **Containerization** | Docker + Docker Compose | Production deployment |

---

## ✨ Core Features

### 👤 Candidate Portal
| Feature | Description |
|---------|-------------|
| **Resume Upload & Parsing** | PDF/DOCX parsing with Gemini-powered structured data extraction |
| **Semantic Job Matching** | Vector cosine similarity + AI-generated match scores per job |
| **AI Copilot** | Gemini-powered conversational assistant using full resume + job context |
| **Resume Optimizer** | AI suggestions to improve resume alignment for specific job descriptions |
| **Application Tracking** | Real-time status tracking with notifications |
| **Profile Health** | Resume completeness scoring and improvement tips |

### 🏢 Recruiter Portal
| Feature | Description |
|---------|-------------|
| **Job Posting** | Rich job creation with skills, filters, salary range |
| **Candidate Ranking** | AI-ranked applicants with match scores |
| **Candidate Comparison** | Side-by-side AI comparison of up to 4 candidates |
| **Hiring Recommendation** | Gemini-generated hire/reject recommendation with reasoning |
| **Interview Scorecard** | AI-generated structured scorecard with evaluation questions |
| **Ranking Explanation** | Plain-language explanations of why a candidate was ranked |
| **AI Copilot** | Context-aware recruiter assistant across entire candidate pipeline |

### 🛡️ Admin Portal
| Feature | Description |
|---------|-------------|
| **Platform Metrics** | API traffic, error rates, P95 latency, timeseries charts |
| **AI Cost Tracking** | Gemini token usage, estimated spend per feature |
| **User Management** | List, disable, reactivate, and role-change all platform users |
| **Reprocessing Jobs** | Trigger bulk resume/embedding rebuilds with progress tracking |
| **AI Version Control** | Manage and bump parser/embedding/analysis/copilot versions |
| **Error Monitoring** | Structured error log with stack traces |

---

## 📸 Screenshots

> *Start the app and navigate to each section to view the full UI.*

| Page | Route |
|------|-------|
| Landing Page | `/` |
| Candidate Dashboard | `/dashboard` |
| Job Finder | `/jobs` |
| AI Copilot (Candidate) | `/copilot` |
| Resume Optimizer | `/resume-optimizer` |
| Recruiter Dashboard | `/recruiter-dashboard` |
| Applicant Management | `/applicants` |
| Candidate Comparison | `/compare` |
| Interview Scorecard | `/scorecard/:id` |
| AI Copilot (Recruiter) | `/recruiter-copilot` |
| Admin Dashboard | `/admin` |

---

## 🚀 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 7.0 (local or Atlas)
- Google Gemini API Key

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.template .env
# Edit .env and fill in:
#   MONGO_URL=mongodb://localhost:27017
#   JWT_SECRET=your-secret-key
#   GEMINI_API_KEY=your-gemini-api-key

# 5. Seed an admin account
python scripts/seed_admin.py admin@yourdomain.com

# 6. Start the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

# 4. Start development server
npm run dev
```

Visit `http://localhost:5173` to access the app.

---

## 🐳 Deployment

### Docker Compose (Recommended)

```bash
# 1. Copy environment template
cp backend/.env.template backend/.env
# Fill in all required values in backend/.env

# 2. Build and start all services
docker compose up --build -d

# 3. Seed admin account
docker exec talentai-backend python scripts/seed_admin.py admin@yourdomain.com

# 4. View logs
docker compose logs -f backend
```

Services will be available at:
- **Frontend**: `http://localhost:80`
- **Backend API**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs`

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for production configuration.

---

## 📡 API Overview

The backend exposes **41 REST endpoints** across 4 routers:

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register new user |
| `POST` | `/login` | Login (returns JWT) |
| `GET` | `/me` | Get current user profile |
| `PUT` | `/me` | Update profile |

### Core (`/api`)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/resumes/upload` | Upload & parse resume |
| `GET` | `/resumes/me` | Get candidate's resume |
| `POST` | `/jobs` | Create job (recruiter) |
| `GET` | `/jobs` | List jobs with filters |
| `POST` | `/applications` | Apply to job |
| `GET` | `/applications/my` | Candidate's applications |
| `GET` | `/applications/job/{id}` | Applicants for a job |
| `PUT` | `/applications/{id}/status` | Update status (recruiter) |
| `GET` | `/match/{job_id}` | Ranked candidates |
| `GET` | `/compare/{job_id}` | Side-by-side comparison |
| `GET` | `/recommendation/{app_id}` | Hiring recommendation |
| `GET` | `/scorecard/{app_id}` | Interview scorecard |
| `GET` | `/explanation/{app_id}` | Ranking explanation |
| `POST` | `/optimize-resume` | Resume optimization |
| `GET` | `/notifications` | User notifications |

### Copilot (`/api/copilot`)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create new chat session |
| `GET` | `/sessions` | List user's sessions |
| `POST` | `/sessions/{id}/messages` | Send message |
| `GET` | `/sessions/{id}/messages` | Get session history |
| `DELETE` | `/sessions/{id}` | Delete session |

### Admin (`/api/admin`) — *Admin role required*
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/metrics/summary` | Platform metrics |
| `GET` | `/users` | List all users |
| `PUT` | `/users/{id}/status` | Enable/disable user |
| `PUT` | `/users/{id}/role` | Change user role |
| `GET` | `/versions` | Current AI versions |
| `PUT` | `/versions/{component}` | Bump AI version |
| `POST` | `/reprocess-{type}` | Trigger bulk reprocessing |
| `GET` | `/jobs` | List reprocessing jobs |

---

## 🗄️ Database Schema Overview

### Collections (MongoDB)

| Collection | Purpose | Key Fields |
|------------|---------|-----------|
| `users` | All user accounts | `email`, `role`, `hashed_password`, `is_active` |
| `resumes` | Parsed resume data | `user_id`, `parsed_data`, `status`, `created_at` |
| `jobs` | Job postings | `recruiter_id`, `role`, `skills`, `status`, `location` |
| `applications` | Job applications | `user_id`, `job_id`, `match_score`, `ai_analysis`, `status` |
| `notifications` | In-app notifications | `user_id`, `title`, `message`, `is_read` |
| `copilot_sessions` | Chat sessions | `user_id`, `mode`, `job_id`, `created_at` |
| `copilot_messages` | Chat history | `session_id`, `role`, `content`, `suggestions` |
| `ai_versions` | AI component versions | `parser_version`, `embedding_version`, `model_version` |
| `reprocessing_jobs` | Background job tracking | `type`, `status`, `processed`, `total` |
| `metrics` | Platform observability | `event_type`, `user_id`, `timestamp`, `metadata` |

### Indexes
All collections have compound indexes optimized for the most frequent queries:
- `applications`: unique index on `(user_id, job_id)` to prevent duplicate applications
- `jobs`: compound index on `(status, created_at)` for filtered listings
- `copilot_messages`: compound index on `(session_id, created_at)` for ordered history

---

## 🔭 Future Roadmap

- [ ] **OAuth SSO** — Google/LinkedIn login for candidates
- [ ] **Email Notifications** — SendGrid integration for application updates
- [ ] **ATS Export** — Export candidates to CSV/PDF
- [ ] **Job Board Integration** — LinkedIn/Indeed job import
- [ ] **Multi-tenant** — Organization-level isolation for enterprise recruiters
- [ ] **Mobile App** — React Native candidate app
- [ ] **Advanced Analytics** — Funnel conversion, time-to-hire metrics
- [ ] **Qdrant Migration** — Upgrade to production-grade vector database

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

<div align="center">

Built with ❤️ using FastAPI, React, MongoDB, and Gemini AI

</div>
