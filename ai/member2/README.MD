# Member 2 — Gemini Semantic Engine

This module performs semantic analysis of publication titles using the Gemini API.

Member 1 provides the `embedding_similarity` score.
Member 2 provides an independent `semantic_score`.

The backend can combine both signals to make the final decision.

## Requirements

* Python 3.10+
* Gemini API key
* Internet connection

## Installation

From the `member2` directory:

```powershell
pip install -r requirements.txt
```

## Set Gemini API Key

The API key is **not stored in the code or Git repository**.

### Windows PowerShell

Run:

```powershell
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

Replace `YOUR_GEMINI_API_KEY` with your actual key.

Example:

```powershell
$env:GEMINI_API_KEY="your_actual_key_here"
```

You can verify that the variable exists with:

```powershell
echo $env:GEMINI_API_KEY
```

Do **not** commit or share the API key.

> Note: The PowerShell environment variable normally applies only to the current terminal session. If you open a new terminal, set it again.

## Running the Test

From the `member2` directory:

```powershell
python test_gemini.py
```

The test reads:

```text
data/sample_input.json
```

and sends each candidate title to Gemini.

## Output

The module returns:

```json
{
  "application_id": "APP004",
  "candidate_results": [
    {
      "registration_id": "REG301",
      "semantic_score": 0.95,
      "reason": "..."
    }
  ]
}
```

### Semantic Score

The score ranges from `0.0` to `1.0`.

* `1.0` → essentially the same meaning
* `0.5` → partially related
* `0.0` → completely different

The score is a **semantic signal only**. Member 2 does not make the final classification.

## Architecture

```text
Input
  │
  ├── Member 1
  │      └── embedding_similarity
  │
  └── Member 2
         └── Gemini
              └── semantic_score
                       │
                       ▼
                  Backend
              Final decision
```

## Important

Never put the Gemini API key directly into:

* Python source files
* `README.md`
* `requirements.txt`
* JSON input files
* Git commits

Use the `GEMINI_API_KEY` environment variable instead.

## Files

```text
member2/
├── semantics/
│   ├── __init__.py
│   └── gemini_semantic.py
├── data/
│   └── sample_input.json
├── test_gemini.py
├── requirements.txt
└── README.md
```
