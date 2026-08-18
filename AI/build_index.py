"""
Build FAISS Index — run once before starting the AI service.

Usage (from the AI/ directory):
    python build_index.py

This reads member_1/data/seed_titles.json and writes:
    member_1/vector_search/index/titles.index
    member_1/vector_search/index/titles_metadata.json

The VectorRetriever (and /api/vector/search endpoint) will not work
until this script has been run at least once.
"""

import sys
from pathlib import Path

# Ensure AI/ root is on the path so member_1 imports resolve.
AI_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(AI_ROOT))

from member_1.vector_search.index_builder import build_index, load_titles_from_json

SEED_PATH = AI_ROOT / "member_1" / "data" / "seed_titles.json"

if __name__ == "__main__":
    print(f"Loading titles from: {SEED_PATH}")
    titles = load_titles_from_json(SEED_PATH)
    print(f"Loaded {len(titles)} titles.")
    build_index(titles)
    print("\nIndex build complete. You can now start the AI service.")
