package com.sih.backend.client;

import com.sih.backend.dto.VectorCandidate;

import java.util.List;

public interface VectorSearchClient {
    /**
     * Find nearest vector candidates for the given normalized title.
     * Returns a list ordered by rank (1 = nearest).
     */
    List<VectorCandidate> findNearestCandidates(String normalizedTitle, String language, int limit);
}
