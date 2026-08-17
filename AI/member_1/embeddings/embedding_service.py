"""
Embedding Service

Provides the main title similarity service.

Responsibilities:
1. Generate title embeddings using LaBSE.
2. Compare titles using cosine similarity.
3. Rank database candidates by similarity.
4. Return the Top-K most similar candidates for
   downstream AI processing.
"""

"""
Embedding Service

Provides semantic embedding similarity scoring for a supplied
candidate pool.

Responsibilities:
1. Generate title embeddings using LaBSE.
2. Calculate cosine similarity between the new title and candidates.
3. Rank the supplied candidate pool by embedding similarity.
4. Return the Top-K candidates for downstream processing.
"""

from .model import load_model, generate_embedding, generate_batch_embeddings
from .similarity import calculate_cosine_similarity


class EmbeddingService:

    def __init__(self):
        self.model = load_model()

    def embed_title(self, title):
        return generate_embedding(self.model, title)

    def embed_titles(self, titles):
        return generate_batch_embeddings(self.model, titles)

    def compare(self, title1, title2):
        embedding1 = self.embed_title(title1)
        embedding2 = self.embed_title(title2)

        return calculate_cosine_similarity(
            embedding1,
            embedding2
        )

    def rank_candidates(self, new_title_data, candidates, top_k=5):
        """
        Calculate embedding similarity between the new title
        and every candidate in the supplied candidate pool.
        """

        if not isinstance(new_title_data, dict):
            raise TypeError("new_title_data must be a dictionary")

        if not isinstance(candidates, list):
            raise TypeError("candidates must be a list")

        required_title_fields = {
            "application_id",
            "title",
            "language"
        }

        missing_fields = required_title_fields - new_title_data.keys()

        if missing_fields:
            raise ValueError(
                f"Missing new title fields: {sorted(missing_fields)}"
            )

        required_candidate_fields = {
            "registration_id",
            "title",
            "language"
        }

        for candidate in candidates:
            missing_fields = (
                required_candidate_fields - candidate.keys()
            )

            if missing_fields:
                raise ValueError(
                    f"Missing candidate fields: {sorted(missing_fields)}"
                )

        if top_k <= 0:
            raise ValueError("top_k must be greater than 0")

        new_embedding = self.embed_title(
            new_title_data["title"]
        )

        if not candidates:
            return {
                "application_id": new_title_data["application_id"],
                "title": new_title_data["title"],
                "language": new_title_data["language"],
                "candidates": []
            }

        candidate_titles = [
            candidate["title"]
            for candidate in candidates
        ]

        candidate_embeddings = self.embed_titles(
            candidate_titles
        )

        results = []

        for candidate, embedding in zip(
            candidates,
            candidate_embeddings
        ):
            score = calculate_cosine_similarity(
                new_embedding,
                embedding
            )

            results.append({
                "registration_id": candidate["registration_id"],
                "title": candidate["title"],
                "language": candidate["language"],
                "embedding_similarity": round(
                    score,
                    4
                )
            })

        results.sort(
            key=lambda x: x["embedding_similarity"],
            reverse=True
        )

        return {
            "application_id": new_title_data["application_id"],
            "title": new_title_data["title"],
            "language": new_title_data["language"],
            "candidates": results[:top_k]
        }