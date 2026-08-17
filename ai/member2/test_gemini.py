import json

from semantics.gemini_semantic import GeminiSemanticEngine


INPUT_FILE = "data/sample_input.json"


with open(INPUT_FILE, "r", encoding="utf-8") as f:
    payload = json.load(f)


engine = GeminiSemanticEngine()

result = engine.analyze_candidates(payload)

print(json.dumps(
    result,
    indent=2,
    ensure_ascii=False
))