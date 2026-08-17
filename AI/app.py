from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from member_1.embeddings.embedding_service import EmbeddingService
from member_1.embeddings.model import MODEL_NAME
from member_1.vector_search.vector_retriever import VectorRetriever


VECTOR_DIMENSIONS = int(os.getenv("AI_EMBEDDING_DIMENSION", "768"))
SIMILARITY_METRIC = os.getenv("AI_SIMILARITY_METRIC", "cosine")

embedding_service = EmbeddingService()
vector_retriever = None


class SemanticSimilarityRequest(BaseModel):
    title: str
    candidate: str
    language: str | None = None


class VectorSearchRequest(BaseModel):
    title: str
    language: str | None = None
    limit: int = Field(default=10, ge=1, le=500)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global vector_retriever
    try:
        vector_retriever = VectorRetriever()
    except Exception:
        vector_retriever = None
    yield


app = FastAPI(title="Title Verification AI Service", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "vector_index_loaded": vector_retriever is not None,
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
            detail="Vector index is not available. Build the index before calling vector search.",
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
