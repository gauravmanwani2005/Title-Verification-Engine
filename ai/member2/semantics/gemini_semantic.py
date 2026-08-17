import os
import json
from typing import Dict

from google import genai
from google.genai import types


MODEL_NAME = "gemini-3.5-flash-lite"


class GeminiSemanticEngine:

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set."
            )

        print(f"[gemini] loading {MODEL_NAME}...")

        self.client = genai.Client(api_key=api_key)

        print("[gemini] model ready")

    def analyze_candidate(
        self,
        new_title: str,
        new_language: str,
        candidate: Dict
    ) -> Dict:

        candidate_title = candidate["title"]
        candidate_language = candidate.get("language", "Unknown")
        embedding_similarity = candidate.get(
            "embedding_similarity",
            None
        )

        prompt = f"""
Compare these two publication titles semantically.

Rules:
- Score 1.0 means the complete titles have essentially the same meaning.
- Score 0.0 means they have no meaningful semantic connection.
- Translation between languages counts as semantic equivalence.
- Synonyms and genuine paraphrases can be equivalent.
- Shared generic words such as "Daily", "News", "Today", "Samachar" do not make titles equivalent.
- Important differences in city/region, topic, subject, time, or publication focus matter.
- Do not guess translations.
- embedding_similarity is supporting evidence only; do not copy it blindly.
- Judge the complete meaning of both titles.

Title A: "{new_title}"
Language A: "{new_language}"

Title B: "{candidate_title}"
Language B: "{candidate_language}"

Embedding similarity: {embedding_similarity}

Return only JSON.
"""

        response = self.client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "semantic_score": {
                            "type": "NUMBER"
                        },
                        "reason": {
                            "type": "STRING"
                        }
                    },
                    "required": [
                        "semantic_score",
                        "reason"
                    ]
                }
            )
        )

        result = json.loads(response.text)

        score = float(result["semantic_score"])

        # Keep the score safely inside [0, 1]
        score = max(0.0, min(1.0, score))

        return {
            "registration_id": candidate["registration_id"],
            "semantic_score": round(score, 4),
            "reason": result["reason"]
        }

    def analyze_candidates(self, payload: Dict) -> Dict:

        new_title = payload["title"]
        new_language = payload.get("language", "Unknown")

        results = []

        for candidate in payload.get("candidates", []):
            results.append(
                self.analyze_candidate(
                    new_title,
                    new_language,
                    candidate
                )
            )

        return {
            "application_id": payload.get("application_id"),
            "candidate_results": results
        }