"""
Vector ANN Index Builder

Builds a FAISS HNSW index from existing registered titles.

The builder does not access the backend database directly.
It receives title records as input and creates:

1. FAISS ANN index
2. Metadata file aligned with the index vectors

Each title record must contain:
    registration_id
    title
    language
"""

import os
import json
from pathlib import Path

# ── macOS ARM (Apple Silicon) compatibility ──────────────────────────────────
# Import the embedding model BEFORE faiss to avoid a BLAS/MPS library conflict
# that causes a segmentation fault when faiss is loaded first.
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
print("INDEX BUILDER MODULE LOADED, __name__ is " + __name__)

import faiss
import numpy as np

from member_1.embeddings.model import (
    load_model,
    generate_batch_embeddings
)

import faiss
import numpy as np


BASE_DIR = Path(__file__).resolve().parent
INDEX_DIR = BASE_DIR / "index"

INDEX_PATH = INDEX_DIR / "titles.index"
METADATA_PATH = INDEX_DIR / "titles_metadata.json"


REQUIRED_FIELDS = {
    "registration_id",
    "title",
    "language"
}


def validate_titles(titles):
    """Validate title records before indexing."""

    if not isinstance(titles, list):
        raise TypeError("titles must be a list")

    if not titles:
        raise ValueError("titles cannot be empty")

    for index, title in enumerate(titles):

        if not isinstance(title, dict):
            raise TypeError(
                f"Title at index {index} must be a dictionary"
            )

        missing_fields = REQUIRED_FIELDS - title.keys()

        if missing_fields:
            raise ValueError(
                f"Title at index {index} is missing fields: "
                f"{sorted(missing_fields)}"
            )

        if not str(title["registration_id"]).strip():
            raise ValueError(
                f"Invalid registration_id at index {index}"
            )

        if not str(title["title"]).strip():
            raise ValueError(
                f"Invalid title at index {index}"
            )

        if not str(title["language"]).strip():
            raise ValueError(
                f"Invalid language at index {index}"
            )


def build_index(
    titles,
    index_path=INDEX_PATH,
    metadata_path=METADATA_PATH
):
    """
    Build a FAISS HNSW index from supplied title records.

    Parameters
    ----------
    titles : list[dict]
        Existing registered title records.

    index_path : Path
        Output path for the FAISS index.

    metadata_path : Path
        Output path for metadata.
    """

    validate_titles(titles)

    model = load_model()

    title_texts = [
        title["title"]
        for title in titles
    ]

    print(
        f"Generating embeddings for "
        f"{len(title_texts)} titles..."
    )

    embeddings = generate_batch_embeddings(
        model,
        title_texts
    )

    embeddings = np.asarray(
        embeddings,
        dtype="float32"
    )

    # Normalize so inner product = cosine similarity.
    faiss.normalize_L2(embeddings)

    dimension = embeddings.shape[1]

    # HNSW approximate nearest-neighbor index.
    index = faiss.IndexHNSWFlat(
        dimension,
        32,
        faiss.METRIC_INNER_PRODUCT
    )

    index.hnsw.efConstruction = 80
    index.hnsw.efSearch = 64

    index.add(embeddings)

    index_path = Path(index_path)
    metadata_path = Path(metadata_path)

    index_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    metadata_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    faiss.write_index(
        index,
        str(index_path)
    )

    metadata = [
        {
            "registration_id": title["registration_id"],
            "title": title["title"],
            "language": title["language"]
        }
        for title in titles
    ]

    with open(
        metadata_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metadata,
            file,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"Index saved to: {index_path}"
    )

    print(
        f"Metadata saved to: {metadata_path}"
    )

    print(
        f"Indexed {len(titles)} titles."
    )


def load_titles_from_json(path):
    """
    Load title records from a JSON file.

    Expected format:

    {
        "candidates": [
            {
                "registration_id": "...",
                "title": "...",
                "language": "..."
            }
        ]
    }
    """

    path = Path(path)

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    if "candidates" not in data:
        raise ValueError(
            "Input JSON must contain a 'candidates' field"
        )

    return data["candidates"]


if __name__ == "__main__":
    try:
        print("Main block started")
        test_data_path = (
            BASE_DIR.parent
            / "data"
            / "test_titles.json"
        )
        print("Loading titles from", test_data_path)
        titles = load_titles_from_json(
            test_data_path
        )
        print("Loaded", len(titles), "titles")
        build_index(titles)
        print("Index building completed")
    except Exception as e:
        import traceback
        print("EXCEPTION OCCURRED:", e)
        traceback.print_exc()