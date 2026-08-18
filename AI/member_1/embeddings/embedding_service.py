"""
Embedding Service — Member 1 (LaBSE)

Responsibilities:
1. Generate title embeddings using LaBSE.
2. Compare two titles using cosine similarity (used by /api/semantic/similarity).
3. Score ENTIRE candidate pool — sort by score — return top_k.
   (Score ALL first, then cut to K — never cut first then score.)
"""

from .model import load_model, generate_embedding, generate_batch_embeddings
from .similarity import calculate_cosine_similarity


class EmbeddingService:

    def __init__(self):
        self.model = load_model()

    def embed_title(self, title: str):
        return generate_embedding(self.model, title)

    def embed_titles(self, titles: list):
        return generate_batch_embeddings(self.model, titles)

    def compare(self, title1: str, title2: str) -> float:
        """Cosine similarity between two titles. Used by /api/semantic/similarity."""
        e1 = self.embed_title(title1)
        e2 = self.embed_title(title2)
        return calculate_cosine_similarity(e1, e2)

    def rank_candidates(self, new_title_data: dict, candidates: list, top_k: int = 20) -> dict:
        """
        Score EVERY candidate in the supplied pool, then sort descending,
        then cut to top_k.

        Correct order (per spec):
            score all candidates → sort → take top_k

        NOT:
            take top_k → score only those

        Args:
            new_title_data: dict with keys application_id, title, language
            candidates:     list of dicts with keys candidate_id, title, language
            top_k:          number of candidates to return after ranking (default 20)
        """

        if not isinstance(new_title_data, dict):
            raise TypeError("new_title_data must be a dict")
        if not isinstance(candidates, list):
            raise TypeError("candidates must be a list")
        if top_k <= 0:
            raise ValueError("top_k must be > 0")

        required_title_fields = {"application_id", "title", "language"}
        missing = required_title_fields - new_title_data.keys()
        if missing:
            raise ValueError(f"Missing new_title_data fields: {sorted(missing)}")

        # Accept both candidate_id and registration_id for backward compatibility
        for c in candidates:
            if "candidate_id" not in c and "registration_id" not in c:
                raise ValueError("Each candidate must have 'candidate_id' or 'registration_id'")
            if "title" not in c:
                raise ValueError("Each candidate must have 'title'")

        if not candidates:
            return {
                "application_id": new_title_data["application_id"],
                "title": new_title_data["title"],
                "language": new_title_data["language"],
                "candidates": []
            }

        # Step 1 — embed the new title
        new_embedding = self.embed_title(new_title_data["title"])

        # Step 2 — embed ALL candidates in one batch (efficient)
        candidate_titles = [c["title"] for c in candidates]
        candidate_embeddings = self.embed_titles(candidate_titles)

        # Step 3 — score every candidate
        scored = []
        for candidate, embedding in zip(candidates, candidate_embeddings):
            score = calculate_cosine_similarity(new_embedding, embedding)
            candidate_id = candidate.get("candidate_id") or candidate.get("registration_id")
            scored.append({
                "candidate_id":       str(candidate_id),
                "registration_id":    str(candidate_id),   # backward compat
                "title":              candidate["title"],
                "language":           candidate.get("language", ""),
                "embedding_similarity": round(float(score), 4),
            })

        # Step 4 — sort descending by embedding_similarity
        scored.sort(key=lambda x: x["embedding_similarity"], reverse=True)

        # Step 5 — cut to top_k AFTER scoring
        return {
            "application_id": new_title_data["application_id"],
            "title":          new_title_data["title"],
            "language":       new_title_data["language"],
            "candidates":     scored[:top_k],
        }
