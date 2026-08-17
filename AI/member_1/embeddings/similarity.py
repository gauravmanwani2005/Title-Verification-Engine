"""
Similarity Module

Provides functions for calculating cosine similarity
between title embeddings.
"""

from sklearn.metrics.pairwise import cosine_similarity

def calculate_cosine_similarity(embedding1, embedding2):
    score = cosine_similarity(
        [embedding1],
        [embedding2]
    )[0][0]

    return float(score)