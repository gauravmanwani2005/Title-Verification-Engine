"""
Vector ANN Retriever

Retrieves candidate titles from the FAISS HNSW index.

Responsibilities:
1. Load the pre-built FAISS ANN index.
2. Load candidate metadata corresponding to the index.
3. Generate a LaBSE embedding for the new title.
4. Retrieve nearest existing titles using ANN search.
5. Return candidate metadata together with the ANN score.

The ANN score is used only for candidate retrieval.
It is NOT the final embedding_similarity score.
"""

import os
import json
from pathlib import Path

# ── macOS ARM (Apple Silicon) compatibility ──────────────────────────────────
# Import the embedding model BEFORE faiss to avoid a BLAS/MPS library conflict
# that causes a segmentation fault when faiss is loaded first.
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from member_1.embeddings.model import (
    load_model,
    generate_embedding
)

import faiss
import numpy as np


BASE_DIR = Path(__file__).resolve().parent
INDEX_PATH = BASE_DIR / "index" / "titles.index"
METADATA_PATH = BASE_DIR / "index" / "titles_metadata.json"


class VectorRetriever:

    def __init__(
        self,
        index_path=INDEX_PATH,
        metadata_path=METADATA_PATH
    ):
        self.model = load_model()

        self.index_path = Path(index_path)
        self.metadata_path = Path(metadata_path)

        if not self.index_path.exists():
            raise FileNotFoundError(
                f"FAISS index not found: {self.index_path}"
            )

        if not self.metadata_path.exists():
            raise FileNotFoundError(
                f"Metadata file not found: {self.metadata_path}"
            )

        self.index = faiss.read_index(
            str(self.index_path)
        )

        with open(
            self.metadata_path,
            "r",
            encoding="utf-8"
        ) as file:
            self.metadata = json.load(file)

        if self.index.ntotal != len(self.metadata):
            raise ValueError(
                "FAISS index size does not match metadata size"
            )

        self.index.hnsw.efSearch = 64

    def retrieve(
        self,
        title,
        top_k=50
    ):
        """
        Retrieve the nearest existing titles.

        Returns:
            [
                {
                    "registration_id": "...",
                    "title": "...",
                    "language": "...",
                    "vector_similarity": 0.7052
                }
            ]
        """

        if not isinstance(title, str) or not title.strip():
            raise ValueError(
                "title must be a non-empty string"
            )

        if top_k <= 0:
            raise ValueError(
                "top_k must be greater than 0"
            )

        embedding = generate_embedding(
            self.model,
            title
        )

        embedding = np.asarray(
            embedding,
            dtype="float32"
        ).reshape(1, -1)

        # Normalize so inner product represents cosine similarity.
        faiss.normalize_L2(embedding)

        scores, indices = self.index.search(
            embedding,
            top_k
        )

        results = []

        for score, index in zip(
            scores[0],
            indices[0]
        ):
            if index == -1:
                continue

            candidate = self.metadata[index]

            results.append({
                "registration_id": candidate["registration_id"],
                "title": candidate["title"],
                "language": candidate["language"],
                "vector_similarity": round(
                    float(score),
                    4
                )
            })

        return results