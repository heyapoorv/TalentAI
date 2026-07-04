# TalentAI — Architecture Documentation

This document describes the internal architecture of TalentAI, including system design decisions, data flows, and component interactions.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph CLIENT["Browser Client"]
        FE["React 18 SPA<br/>Vite + TailwindCSS"]
    end

    subgraph API["FastAPI Backend (Async)"]
        MW["Middleware Stack<br/>Security → Rate Limit → Logging → CORS"]
        AUTH["Auth Router<br/>/api/auth"]
        CORE["Core Router<br/>/api"]
        COP["Copilot Router<br/>/api/copilot"]
        ADM["Admin Router<br/>/api/admin"]
    end

    subgraph SERVICES["Service Layer"]
        GEN["generation.py<br/>Gemini 2.5 Flash"]
        MATCH["matcher.py<br/>Cosine Similarity"]
        PARSE["parser.py<br/>PDF/DOCX → Text"]
        EMBED["embedding.py<br/>SentenceTransformers"]
        COPILOT["copilot.py<br/>Conversation Engine"]
        RI["recruiter_intelligence.py<br/>Hiring AI"]
        OPT["resume_optimizer.py<br/>Resume AI"]
        OBS["observability.py<br/>Metrics Engine"]
        CACHE["cache.py<br/>LRU + Redis"]
        VER["versioning.py<br/>AI Version Control"]
    end

    subgraph DATA["Data Layer"]
        MONGO["MongoDB 7<br/>Primary Store"]
        CHROMA["ChromaDB<br/>Vector Store"]
    end

    FE -->|"JWT Bearer"| MW
    MW --> AUTH & CORE & COP & ADM
    CORE --> GEN & MATCH & PARSE & EMBED & RI & OPT
    COP --> COPILOT
    ADM --> OBS & VER
    COPILOT --> CACHE
    GEN & MATCH & EMBED --> CHROMA
    CORE & AUTH & COP & ADM --> MONGO
    OBS --> MONGO
```

---

## 2. Frontend Architecture

### Route Structure
```
src/
├── App.jsx                 # Root router + ProtectedRoute RBAC
├── context/
│   └── AuthContext.jsx     # JWT decode, user state, login/logout
├── api/
│   └── axios.js            # Axios instance with Bearer token interceptor
├── components/
│   ├── Layout.jsx          # Sidebar + notification panel (role-aware)
│   └── Skeleton.jsx        # Loading state primitive
└── pages/
    ├── Home.jsx                    # Public landing page
    ├── Login.jsx / Register.jsx    # Auth pages
    ├── CandidateDashboard.jsx      # Candidate home
    ├── UploadResume.jsx            # Resume upload + status polling
    ├── FindJobs.jsx                # Semantic job search + filters
    ├── CopilotChat.jsx             # Candidate AI copilot
    ├── CandidateAiInsight.jsx      # Match insights per application
    ├── ResumeOptimizer.jsx         # Resume ↔ JD optimization
    ├── ApplicationStatus.jsx       # Application tracker
    ├── Profile.jsx                 # Profile management
    ├── RecruiterDashboard.jsx      # Recruiter home
    ├── JobsList.jsx                # Recruiter's job management
    ├── PostJob.jsx                 # Job creation form
    ├── ApplicantManagement.jsx     # Candidate pipeline
    ├── CandidateComparison.jsx     # Side-by-side comparison
    ├── InterviewScorecard.jsx      # AI scorecard viewer
    ├── RecruiterCopilot.jsx        # Recruiter AI copilot
    └── AdminDashboard.jsx          # Platform observability + user mgmt
```

### RBAC Routing
```mermaid
flowchart TD
    Login --> JWT["Decode JWT → role"]
    JWT -->|role=candidate| CD["/dashboard"]
    JWT -->|role=recruiter| RD["/recruiter-dashboard"]
    JWT -->|role=admin| AD["/admin"]
    
    ProtectedRoute -->|role mismatch| Redirect["Redirect to home role"]
    ProtectedRoute -->|unauthenticated| Login2["/"]
```

---

## 3. Backend Architecture

### Middleware Stack (Outermost → Innermost)
```
Request
  │
  ▼
SecurityHeadersMiddleware   — CSP, X-Frame-Options, HSTS
  │
  ▼
RateLimitMiddleware         — In-memory, per-IP: 60 req/min default, 10 req/min auth
  │
  ▼
RequestLoggingMiddleware    — Structured JSON logs + X-Request-ID tracing
  │
  ▼
CORSMiddleware              — Origin allowlist from ALLOWED_ORIGINS env
  │
  ▼
FastAPI Router              — Route dispatch
```

### Startup Sequence
```mermaid
sequenceDiagram
    participant App
    participant Env
    participant MongoDB
    participant ChromaDB
    participant Embedding

    App->>Env: Validate MONGO_URL, JWT_SECRET, GEMINI_API_KEY
    App->>MongoDB: Connect + ping
    App->>MongoDB: Ensure 10 collections
    App->>MongoDB: Create 15+ compound indexes
    App->>Embedding: Load all-MiniLM-L6-v2 model
    App->>ChromaDB: Connect persistent client
    App->>App: Ready → yield
```

---

## 4. AI Pipeline

### 4a. Resume Parsing Pipeline
```mermaid
flowchart LR
    Upload["File Upload<br/>PDF / DOCX"] --> Parse["parser.py<br/>pdfplumber / python-docx<br/>→ raw text"]
    Parse --> Gemini["Gemini 2.5 Flash<br/>Structured extraction:<br/>name, skills, experience,<br/>education, location"]
    Gemini --> Mongo["MongoDB<br/>resumes collection<br/>status=Processing"]
    Mongo --> BGTask["BackgroundTask<br/>SentenceTransformer<br/>Embedding"]
    BGTask --> Chroma["ChromaDB<br/>resumes collection<br/>cosine index"]
    BGTask --> StatusUpdate["MongoDB<br/>status=Complete | Failed"]
```

### 4b. Matching Pipeline
```mermaid
flowchart TD
    Apply["Candidate Applies<br/>to Job"] --> FetchEmbed["Load resume<br/>& job embeddings<br/>from ChromaDB"]
    FetchEmbed --> Cosine["Cosine Similarity<br/>matcher.py"]
    Cosine --> Score["Raw match score<br/>0.0–1.0"]
    Score --> Gemini2["Gemini 2.5 Flash<br/>Structured AI analysis:<br/>strengths, gaps,<br/>recommendations"]
    Gemini2 --> Store["MongoDB applications<br/>match_score + ai_analysis"]
    Store --> Notify["Notification<br/>created for candidate"]
```

### 4c. Recruiter Intelligence Pipeline
```mermaid
flowchart LR
    Trigger["Recruiter requests<br/>Recommendation / Scorecard<br/>/ Ranking Explanation"] --> Load["Load application +<br/>resume + job from MongoDB"]
    Load --> Gemini3["Gemini 2.5 Flash<br/>recruiter_intelligence.py"]
    Gemini3 -->|"Recommendation"| Rec["hire/reject/hold<br/>+ detailed reasoning"]
    Gemini3 -->|"Scorecard"| SC["10 structured<br/>interview questions"]
    Gemini3 -->|"Explanation"| Exp["Plain-language<br/>ranking rationale"]
    Rec & SC & Exp --> Save["Persist to<br/>applications collection"]
```

### 4d. Copilot Pipeline
```mermaid
sequenceDiagram
    participant User
    participant CopilotRouter
    participant CopilotService
    participant Redis/LRU
    participant MongoDB
    participant Gemini

    User->>CopilotRouter: POST /sessions/{id}/messages {content}
    CopilotRouter->>MongoDB: Load resume text
    CopilotRouter->>MongoDB: Load job description (if job_id set)
    CopilotRouter->>MongoDB: Load AI match analysis (if application exists)
    CopilotRouter->>Redis/LRU: Load conversation history (last 20 turns)
    CopilotRouter->>Gemini: Structured prompt (system + history + context + user msg)
    Gemini-->>CopilotRouter: JSON {answer, suggestions[3]}
    CopilotRouter->>MongoDB: Persist message + response
    CopilotRouter->>Redis/LRU: Update history
    CopilotRouter-->>User: {answer, suggestions}
```

---

## 5. Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant API
    participant MongoDB

    Browser->>API: POST /api/auth/login {email, password}
    API->>MongoDB: find_one({email})
    MongoDB-->>API: user document
    API->>API: verify bcrypt hash
    API->>API: check is_active == True
    API->>API: create_access_token(sub=user_id, exp=24h)
    API->>MongoDB: update last_login timestamp
    API-->>Browser: {access_token, role}

    Note over Browser,API: Subsequent requests
    Browser->>API: GET /api/... Authorization: Bearer <token>
    API->>API: get_current_user() → decode JWT → fetch user
    API->>API: role check: candidate_only | recruiter_only | admin_only
    API-->>Browser: 200 OK | 401 | 403
```

---

## 6. Admin Workflow

```mermaid
flowchart TD
    Login["Login as admin"] --> AdminDash["/admin Dashboard"]
    AdminDash --> Metrics["Metrics Tab<br/>API traffic, Gemini spend,<br/>cache hit rate, errors"]
    AdminDash --> Users["User Management Tab<br/>List | Disable | Enable | Role Change"]
    AdminDash --> Versions["AI Version Control Tab<br/>Bump parser/embedding/model versions"]
    AdminDash --> Reprocess["Bulk Reprocessing<br/>Resumes | Embeddings | Applications"]
    
    Users -->|"PUT /admin/users/{id}/status"| MongoDB1["MongoDB: is_active update"]
    Users -->|"PUT /admin/users/{id}/role"| MongoDB2["MongoDB: role update"]
    Reprocess -->|"POST /admin/reprocess-{type}"| BGJob["Background reprocessing job<br/>with progress tracking"]
    Metrics -->|"GET /admin/metrics/summary"| OBS["observability.py<br/>aggregation pipeline"]
```

---

## 7. Database Relationships

```mermaid
erDiagram
    USERS {
        ObjectId _id PK
        string email
        string role
        string hashed_password
        bool is_active
        datetime created_at
        datetime last_login
    }

    RESUMES {
        ObjectId _id PK
        string user_id FK
        object parsed_data
        string status
        datetime created_at
    }

    JOBS {
        ObjectId _id PK
        string recruiter_id FK
        string role
        array skills
        string status
        string location
        datetime created_at
    }

    APPLICATIONS {
        ObjectId _id PK
        string user_id FK
        string job_id FK
        float match_score
        object ai_analysis
        string status
        datetime created_at
    }

    COPILOT_SESSIONS {
        ObjectId _id PK
        string user_id FK
        string mode
        string job_id
        datetime updated_at
    }

    COPILOT_MESSAGES {
        ObjectId _id PK
        string session_id FK
        string user_id FK
        string role
        string content
        array suggestions
    }

    NOTIFICATIONS {
        ObjectId _id PK
        string user_id FK
        string title
        string message
        bool is_read
    }

    METRICS {
        ObjectId _id PK
        string event_type
        string user_id
        datetime timestamp
        object metadata
    }

    USERS ||--o| RESUMES : "has one"
    USERS ||--o{ APPLICATIONS : "submits"
    USERS ||--o{ COPILOT_SESSIONS : "owns"
    USERS ||--o{ NOTIFICATIONS : "receives"
    JOBS ||--o{ APPLICATIONS : "receives"
    COPILOT_SESSIONS ||--o{ COPILOT_MESSAGES : "contains"
```
