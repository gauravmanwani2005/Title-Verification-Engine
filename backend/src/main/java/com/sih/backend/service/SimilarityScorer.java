package com.sih.backend.service;

import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.apache.commons.text.similarity.LevenshteinDistance;
import org.springframework.stereotype.Service;

@Service
public class SimilarityScorer {

    private final JaroWinklerSimilarity jw;
    private final LevenshteinDistance lev;

    public SimilarityScorer() {
        this.jw = new JaroWinklerSimilarity();
        this.lev = new LevenshteinDistance();
    }

    /**
     * Calculates the combined similarity percentage of two normalized strings
     * using Jaro-Winkler and Levenshtein Distance.
     */
    public double calculateSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) {
            return 0.0;
        }
        if (s1.trim().equalsIgnoreCase(s2.trim())) {
            return 100.0;
        }

        String str1 = s1.trim().toLowerCase();
        String str2 = s2.trim().toLowerCase();

        // 1. Jaro-Winkler (returns between 0.0 and 1.0)
        double jaroScore = jw.apply(str1, str2);
        double jaroPercent = jaroScore * 100.0;

        // 2. Levenshtein Distance
        int editDistance = lev.apply(str1, str2);
        int maxLen = Math.max(str1.length(), str2.length());
        double levPercent = maxLen == 0 ? 100.0 : (1.0 - ((double) editDistance / maxLen)) * 100.0;

        // Combine scores (average)
        return (jaroPercent + levPercent) / 2.0;
    }
}
