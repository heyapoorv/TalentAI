import chromadb

import os
import logging

logger = logging.getLogger(__name__)

# ==============================
# CONFIG
# ==============================
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

import google.generativeai as genai

# ==============================
# INIT MODEL (SAFE)
# ==============================
embedder = None

def load_model():
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        logger.info("Gemini Embedding model configured")
    except Exception as e:
        logger.error(f"Embedding model config failed: {e}")

# ==============================
# INIT CHROMA
# ==============================
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

resume_collection = chroma_client.get_or_create_collection(
    name="resumes",
    metadata={"hnsw:space": "cosine"}
)

job_collection = chroma_client.get_or_create_collection(
    name="jobs",
    metadata={"hnsw:space": "cosine"}
)

# ==============================
# EMBEDDING FUNCTION
# ==============================
def get_embedding(text: str) -> list[float]:
    result = genai.embed_content(
        model="models/embedding-001",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

# ==============================
# ADD EMBEDDINGS
# ==============================
def add_resume_embedding(resume_id: str, text: str):
    try:
        embedding = get_embedding(text)

        resume_collection.upsert(
            ids=[str(resume_id)],
            documents=[text],
            embeddings=[embedding],
            metadatas=[{"type": "resume"}]
        )

    except Exception as e:
        logger.error(f"Resume embedding error: {e}")

def add_job_embedding(job_id: str, text: str):
    try:
        embedding = get_embedding(text)

        job_collection.upsert(
            ids=[str(job_id)],
            documents=[text],
            embeddings=[embedding],
            metadatas=[{"type": "job"}]
        )

    except Exception as e:
        logger.error(f"Job embedding error: {e}")

# ==============================
# GET EMBEDDINGS
# ==============================
def get_resume_embedding(resume_id: str) -> list[float]:
    try:
        result = resume_collection.get(
            ids=[str(resume_id)],
            include=["embeddings"]
        )

        if result and len(result.get("embeddings", [])) > 0:
            return result["embeddings"][0]


        raise ValueError("Resume embedding not found")

    except Exception as e:
        logger.error(f"Get resume embedding error: {e}")
        return []

def get_job_embedding(job_id: str) -> list[float]:
    try:
        result = job_collection.get(
            ids=[str(job_id)],
            include=["embeddings"]
        )

        if result and len(result.get("embeddings", [])) > 0:
            return result["embeddings"][0]


        raise ValueError("Job embedding not found")

    except Exception as e:
        logger.error(f"Get job embedding error: {e}")
        return []

# Auto-load on import
load_model()
