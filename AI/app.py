from contextlib import asynccontextmanager
import os

# ── macOS ARM (Apple Silicon) compatibility ──────────────────────────────────
# Set TOKENIZERS_PARALLELISM before any model/tokenizer import to prevent
# a segfault caused by fork-unsafe tokenizer parallelism.
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from member_1.embeddings.embedding_service import EmbeddingService
from member_1.embeddings.model import MODEL_NAME
from member_1.vector_search.vector_retriever import VectorRetriever

# Load .env file (GEMINI_API_KEY lives here)
load_dotenv()

VECTOR_DIMENSIONS = int(os.getenv("AI_EMBEDDING_DIMENSION", "768"))
SIMILARITY_METRIC = os.getenv("AI_SIMILARITY_METRIC", "cosine")

embedding_service = EmbeddingService()
vector_retriever = None
gemini_engine = None


class SemanticSimilarityRequest(BaseModel):
    title: str
    candidate: str
    language: str | None = None


class VectorSearchRequest(BaseModel):
    title: str
    language: str | None = None
    limit: int = Field(default=50, ge=1, le=500)


class GeminiAnalyzeRequest(BaseModel):
    application_id: str | None = None
    title: str
    language: str | None = "en"
    candidates: list


@asynccontextmanager
async def lifespan(app: FastAPI):
    global vector_retriever, gemini_engine

    # Load Member 1 vector index
    try:
        vector_retriever = VectorRetriever()
        print("[vector] FAISS index loaded successfully.")
    except FileNotFoundError as e:
        print(f"[vector] FAISS index not found — run 'python build_index.py' first. Detail: {e}")
        vector_retriever = None
    except Exception as e:
        print(f"[vector] Failed to load FAISS index: {e}")
        vector_retriever = None

    # Load Member 2 Gemini engine (only if API key is set)
    try:
        from member2.semantics.gemini_semantic import GeminiSemanticEngine
        gemini_engine = GeminiSemanticEngine()
    except Exception as e:
        print(f"[gemini] Not loaded: {e}")
        gemini_engine = None

    yield


app = FastAPI(title="Title Verification AI Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "vector_index_loaded": vector_retriever is not None,
        "gemini_loaded": gemini_engine is not None,
        "model": MODEL_NAME,
        "dimensions": VECTOR_DIMENSIONS,
        "metric": SIMILARITY_METRIC,
    }


@app.post("/api/semantic/similarity")
def semantic_similarity(request: SemanticSimilarityRequest):
    similarity = embedding_service.compare(
        request.title,
        request.candidate,
    )
    return {
        "similarity": round(float(similarity), 4),
        "model": MODEL_NAME,
        "dimensions": VECTOR_DIMENSIONS,
        "metric": SIMILARITY_METRIC,
    }


@app.post("/api/vector/search")
def vector_search(request: VectorSearchRequest):
    if vector_retriever is None:
        raise HTTPException(
            status_code=503,
            detail="Vector index is not available.",
        )
    candidates = vector_retriever.retrieve(
        request.title,
        top_k=request.limit,
    )
    return {
        "model": MODEL_NAME,
        "dimensions": VECTOR_DIMENSIONS,
        "metric": SIMILARITY_METRIC,
        "candidates": candidates,
    }


@app.post("/api/gemini/analyze")
def gemini_analyze(request: GeminiAnalyzeRequest):
    """
    Member 2 — Gemini semantic analysis.
    Takes a title + list of candidates (with embedding_similarity from Member 1)
    and returns a semantic_score + reason for each candidate.
    """
    if gemini_engine is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini engine not available. Check GEMINI_API_KEY environment variable.",
        )

    payload = {
        "application_id": request.application_id,
        "title": request.title,
        "language": request.language,
        "candidates": request.candidates,
    }

    result = gemini_engine.analyze_candidates(payload)
    return result


class GeminiSafetyRequest(BaseModel):
    title: str
    language: str | None = "en"


@app.post("/api/gemini/safety")
def gemini_safety(request: GeminiSafetyRequest):
    """
    Step 1 content safety gate.
    Checks if the proposed title is appropriate for a legitimate press publication.
    Returns { "safe": bool, "reason": str }
    If Gemini is unavailable, defaults to safe=True so the pipeline continues.
    """
    if gemini_engine is None:
        # Gemini not available — fail open (let blocklist handle it downstream)
        return {"safe": True, "reason": "Content safety check unavailable — proceeding to rule engine."}

    try:
        result = gemini_engine.check_content_safety(request.title, request.language or "en")
        return result
    except Exception as e:
        # Fail open — don't block submissions if Gemini is temporarily down
        return {"safe": True, "reason": f"Content safety check failed: {str(e)}"}
