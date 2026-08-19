"""
Gemini Semantic Engine — Member 2

Receives the top-K embedding-ranked candidates from Member 1.
Returns semantic_score + reason for each.

Key contract:
- Uses candidate_id (or registration_id) as the stable identifier.
- Returns semantic_score in [0, 1].
- Does NOT overwrite or modify embedding_similarity.
- semanticScore and embeddingScore remain separate fields.
"""

import os
import json
from typing import Dict, List

from google import genai
from google.genai import types


MODEL_NAME = "gemini-3.5-flash-lite"


class GeminiSemanticEngine:

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set.")
        print(f"[gemini] loading {MODEL_NAME}...")
        self.client = genai.Client(api_key=api_key)
        print("[gemini] model ready")

    def analyze_candidate(self, new_title: str, new_language: str, candidate: Dict) -> Dict:
        candidate_id    = candidate.get("candidate_id") or candidate.get("registration_id")
        candidate_title = candidate["title"]
        candidate_lang  = candidate.get("language", "Unknown")
        emb_sim         = candidate.get("embedding_similarity", None)

        prompt = f"""
Compare these two publication titles semantically.

Rules:
- Score 1.0 = titles have essentially the same meaning.
- Score 0.0 = no meaningful semantic connection.
- Translation between languages counts as semantic equivalence.
- Synonyms and genuine paraphrases can be equivalent.
- Generic words like "Daily", "News", "Samachar", "Today" alone do NOT make titles equivalent.
- Differences in city, region, topic, subject, or publication focus matter.
- Do not guess translations.
- embedding_similarity is supporting evidence only; do not copy it blindly.
- Judge the COMPLETE meaning of both titles.
- Check for typos also 
- Also check for multilingual similarity and meaning of the titles 

Title A: "{new_title}"
Language A: "{new_language}"

Title B: "{candidate_title}"
Language B: "{candidate_lang}"

Embedding similarity (supporting evidence): {emb_sim}

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
                        "semantic_score": {"type": "NUMBER"},
                        "reason":         {"type": "STRING"},
                    },
                    "required": ["semantic_score", "reason"],
                },
            ),
        )

        result = json.loads(response.text)
        score  = float(result["semantic_score"])
        score  = max(0.0, min(1.0, score))

        return {
            "candidate_id":    str(candidate_id),
            "registration_id": str(candidate_id),  # backward compat
            "semantic_score":  round(score, 4),
            "reason":          result["reason"],
            # embedding_similarity is NOT included here — kept separate in the backend
        }

    def analyze_candidates(self, payload: Dict) -> Dict:
        new_title    = payload["title"]
        new_language = payload.get("language", "Unknown")

        results: List[Dict] = []
        for candidate in payload.get("candidates", []):
            results.append(
                self.analyze_candidate(new_title, new_language, candidate)
            )

        return {
            "application_id":    payload.get("application_id"),
            "candidate_results": results,
        }

    def check_content_safety(self, title: str, language: str) -> Dict:
        """
        Step 1 content safety gate.

        Checks whether a proposed publication title is appropriate for
        a legitimate Indian press publication under PRGI guidelines.

        Returns:
            {
                "safe": bool,       # True = title is appropriate, False = reject
                "reason": str       # explanation if not safe
            }
        """
        prompt = f"""
You are a content safety reviewer for the Press Registrar General of India (PRGI).

Your job is to decide whether a proposed publication title is appropriate for a legitimate Indian press/newspaper/magazine.

A title is UNSAFE if it:
- Contains or promotes terrorism, extremism, violence, or incitement to hatred
- References illegal drugs, narcotics, or substance abuse
- Contains obscene, pornographic, or sexually explicit content
- Impersonates government agencies (CBI, NIA, RAW, Police, Army, etc.)
- Promotes or glorifies crime, murder, rape, or other serious offenses
- Contains hate speech targeting religion, caste, ethnicity, or gender
- Is clearly inappropriate or offensive for a public publication

A title is SAFE if it:
- Is a normal newspaper/magazine name even if it touches sensitive topics journalistically
  (e.g., "Crime Reporter", "Anti-Drug Chronicle", "Terror Watch" are SAFE — they report on topics)
- Contains words that sound sensitive but are used in a neutral/journalistic context

Proposed title: "{title}"
Language: "{language}"

Respond with JSON only. Be strict about genuinely harmful content but do NOT over-reject legitimate journalistic titles.
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
                        "safe":   {"type": "BOOLEAN"},
                        "reason": {"type": "STRING"},
                    },
                    "required": ["safe", "reason"],
                },
            ),
        )

        result = json.loads(response.text)
        return {
            "safe":   bool(result["safe"]),
            "reason": result["reason"],
        }
