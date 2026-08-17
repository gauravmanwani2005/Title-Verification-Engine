"""
Embedding Model Evaluation

Evaluates LaBSE using predefined title pairs to measure
its behaviour for:

1. Multilingual semantic similarity
2. Spelling variations
3. Different/unrelated titles
""" 

import json
from pathlib import Path

from member_1.embeddings.embedding_service import EmbeddingService


DATA_PATH = Path(__file__).parent.parent / "data" / "evaluation_pairs.json"


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)

    service = EmbeddingService()

    for category, pairs in data.items():
        print(f"\n--- {category.upper()} ---")

        for title1, title2 in pairs:
            score = service.compare(title1, title2)

            print(
                f"{title1} | {title2} → {score:.4f}"
            )


if __name__ == "__main__":
    main()