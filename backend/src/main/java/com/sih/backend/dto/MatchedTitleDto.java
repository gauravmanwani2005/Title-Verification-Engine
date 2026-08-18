package com.sih.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a single candidate title in the verification response.
 *
 * Score fields are kept strictly separate per the pipeline spec:
 *   fuzzyScore      — lexical similarity (Jaro-Winkler + Levenshtein)
 *   phoneticScore   — phonetic similarity (DoubleMetaphone)
 *   embeddingScore  — Member 1 (LaBSE) cosine similarity × 100
 *   semanticScore   — Member 2 (Gemini) semantic score × 100
 *   finalScore      — combined score used for the 3-way decision
 *
 * embeddingScore and semanticScore are NEVER merged into each other.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class MatchedTitleDto {

    /** DB primary key of the matched title — the stable candidate identifier. */
    private Long candidateId;

    private String title;

    private Double fuzzyScore;
    private Double phoneticScore;

    /** Member 1 (LaBSE) score, 0–100. Populated after embedding stage. */
    private Double embeddingScore;

    /** Member 2 (Gemini) score, 0–100. Populated after semantic stage. */
    private Double semanticScore;

    /** Gemini's plain-English reason for its score. */
    private String semanticReason;

    /**
     * Final score used for ranking and the 3-way decision.
     * Set explicitly after both Member 1 and Member 2 have run.
     */
    private Double finalScore;

    private List<String> matchTypes = new ArrayList<>();

    // ─── Constructors ─────────────────────────────────────────────────────────

    public MatchedTitleDto() {}

    /** Primary constructor used during candidate scoring. */
    public MatchedTitleDto(Long candidateId, String title,
                           Double fuzzyScore, Double phoneticScore,
                           List<String> matchTypes) {
        this.candidateId = candidateId;
        this.title = title;
        this.fuzzyScore = fuzzyScore;
        this.phoneticScore = phoneticScore;
        this.matchTypes = matchTypes != null ? new ArrayList<>(matchTypes) : new ArrayList<>();
    }

    /** Legacy constructor for backward-compatible deserialization from Submission JSON. */
    public MatchedTitleDto(String title, double similarity, String matchType) {
        this.title = title;
        this.finalScore = similarity;
        this.matchTypes = new ArrayList<>();
        if (matchType != null) {
            if (matchType.contains("FUZZY"))    { this.fuzzyScore    = similarity; this.matchTypes.add("FUZZY"); }
            if (matchType.contains("PHONETIC")) { this.phoneticScore = similarity; this.matchTypes.add("PHONETIC"); }
            if (matchType.contains("EMBEDDED") || matchType.contains("SEMANTIC")) {
                this.embeddingScore = similarity; this.matchTypes.add("EMBEDDED");
            }
            if (matchType.contains("GEMINI"))   { this.semanticScore = similarity; this.matchTypes.add("GEMINI"); }
        }
    }

    // ─── getSimilarity — used for backward-compatible JSON field "similarity" ─

    /**
     * Returns finalScore if set; otherwise the best available score.
     * Used for the legacy "similarity" JSON field in the API response.
     */
    public Double getSimilarity() {
        if (finalScore != null) return finalScore;
        double max = 0.0;
        if (fuzzyScore    != null) max = Math.max(max, fuzzyScore);
        if (phoneticScore != null) max = Math.max(max, phoneticScore);
        if (embeddingScore!= null) max = Math.max(max, embeddingScore);
        if (semanticScore != null) max = Math.max(max, semanticScore);
        return max;
    }

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public Long getCandidateId()                 { return candidateId; }
    public void setCandidateId(Long candidateId) { this.candidateId = candidateId; }

    public String getTitle()            { return title; }
    public void setTitle(String title)  { this.title = title; }

    public Double getFuzzyScore()                  { return fuzzyScore; }
    public void setFuzzyScore(Double fuzzyScore)   { this.fuzzyScore = fuzzyScore; }

    public Double getPhoneticScore()                     { return phoneticScore; }
    public void setPhoneticScore(Double phoneticScore)   { this.phoneticScore = phoneticScore; }

    public Double getEmbeddingScore()                      { return embeddingScore; }
    public void setEmbeddingScore(Double embeddingScore)   { this.embeddingScore = embeddingScore; }

    public Double getSemanticScore()                     { return semanticScore; }
    public void setSemanticScore(Double semanticScore)   { this.semanticScore = semanticScore; }

    public String getSemanticReason()                        { return semanticReason; }
    public void setSemanticReason(String semanticReason)     { this.semanticReason = semanticReason; }

    public Double getFinalScore()                    { return finalScore; }
    public void setFinalScore(Double finalScore)     { this.finalScore = finalScore; }

    public List<String> getMatchTypes()                      { return matchTypes; }
    public void setMatchTypes(List<String> matchTypes)       { this.matchTypes = matchTypes != null ? matchTypes : new ArrayList<>(); }

    public String getMatchType() {
        return matchTypes != null && !matchTypes.isEmpty()
                ? String.join("_AND_", matchTypes) : "NONE";
    }
}
