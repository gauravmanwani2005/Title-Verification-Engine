"""
Model Module

Loads the multilingual LaBSE model and provides functions
for generating embeddings for individual or multiple titles.
"""

from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/LaBSE"

def load_model():
    return SentenceTransformer(MODEL_NAME)


def generate_embedding(model, title):
    return model.encode(title)

def generate_batch_embeddings(model, titles):
    return model.encode(titles)