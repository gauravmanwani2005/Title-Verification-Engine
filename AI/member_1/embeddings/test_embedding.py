"""
Embedding Pipeline Test

Tests the complete Member 1 pipeline using the sample
title database.

Pipeline:
Test Input → LaBSE → Similarity → Top-K Ranking
→ Structured JSON Output
"""

import json
from pathlib import Path

from member_1.embeddings.embedding_service import EmbeddingService


DATA_PATH = Path(__file__).parent.parent / "data" / "test_titles.json"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "ranked_candidates.json"


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)

    service = EmbeddingService()

    result = service.rank_candidates(
        data["new_title"],
        data["candidates"],
        top_k=5
    )

    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False
        )

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\nOutput saved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()