"""
Tests the embedding pipeline.

Pipeline:
    New title
        ↓
    Vector ANN retrieval
        ↓
    Candidate pool
        ↓
    Embedding similarity scoring
        ↓
    Top-K candidates
        ↓
    Llama-ready JSON
"""

import json

from member_1.vector_search.vector_retriever import VectorRetriever
from member_1.embeddings.embedding_service import EmbeddingService


def main():

    new_title_data = {
        "application_id": "APP001",
        "title": "Daily Evening",
        "language": "English"
    }

    # 1. Vector ANN retrieves the candidate pool
    retriever = VectorRetriever()

    candidate_pool = retriever.retrieve(
        new_title_data["title"],
        top_k=10
    )

    # Remove ANN-only score before embedding scoring.
    # The embedding service calculates its own score.
    candidates = [
        {
            "registration_id": candidate["registration_id"],
            "title": candidate["title"],
            "language": candidate["language"]
        }
        for candidate in candidate_pool
    ]

    print(f"\nCandidate pool: {len(candidates)}")

    # 2. Calculate embedding similarity
    embedding_service = EmbeddingService()

    result = embedding_service.rank_candidates(
        new_title_data,
        candidates,
        top_k=5
    )

    # 3. Display Llama-ready output
    print("\nLlama-ready output:\n")

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False
        )
    )


if __name__ == "__main__":
    main()