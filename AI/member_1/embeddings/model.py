"""
Model Module

Loads the multilingual LaBSE model and provides functions
for generating embeddings for individual or multiple titles.
"""

import os

# Prevent tokenizer parallelism fork-safety crash on macOS ARM (Apple Silicon).
# Must be set before any tokenizer import occurs.
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/LaBSE"

_model = None


def load_model():
    """
    Load LaBSE once and reuse the same model instance.
    """
    global _model

    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)

    return _model


def generate_embedding(model, title):
    return model.encode(title)


def generate_batch_embeddings(model, titles):
    return model.encode(titles)