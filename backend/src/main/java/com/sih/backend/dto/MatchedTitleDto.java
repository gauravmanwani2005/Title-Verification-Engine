package com.sih.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class MatchedTitleDto {
    private String title;
    private Double similarity;
    private String matchType; // PHONETIC or FUZZY or SEMANTIC/EMBEDDED
    private Double fuzzyScore;
    private Double phoneticScore;
    private Double embeddedScore;
    private List<String> matchTypes;

    public MatchedTitleDto() {}

    public MatchedTitleDto(String title, Double fuzzyScore, Double phoneticScore, Double embeddedScore, List<String> matchTypes) {
        this.title = title;
        this.fuzzyScore = fuzzyScore;
        this.phoneticScore = phoneticScore;
        this.embeddedScore = embeddedScore;
        this.matchTypes = matchTypes != null ? matchTypes : new ArrayList<>();
        
        // Derive similarity for backward compatibility
        double max = 0.0;
        if (fuzzyScore != null) max = Math.max(max, fuzzyScore);
        if (phoneticScore != null) max = Math.max(max, phoneticScore);
        if (embeddedScore != null) max = Math.max(max, embeddedScore);
        this.similarity = max;

        // Derive matchType for backward compatibility
        if (this.matchTypes.isEmpty()) {
            this.matchType = "NONE";
        } else {
            this.matchType = String.join("_AND_", this.matchTypes);
        }
    }

    // Constructor for backward compatibility deserialization
    public MatchedTitleDto(String title, double similarity, String matchType) {
        this.title = title;
        this.similarity = similarity;
        this.matchType = matchType;
        this.matchTypes = new ArrayList<>();
        if (matchType != null) {
            if (matchType.contains("FUZZY")) {
                this.fuzzyScore = similarity;
                this.matchTypes.add("FUZZY");
            }
            if (matchType.contains("PHONETIC")) {
                this.phoneticScore = similarity;
                this.matchTypes.add("PHONETIC");
            }
            if (matchType.contains("SEMANTIC") || matchType.contains("EMBEDDED")) {
                this.embeddedScore = similarity;
                this.matchTypes.add("EMBEDDED");
            }
        }
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Double getSimilarity() {
        double max = 0.0;
        boolean hasAny = false;
        if (fuzzyScore != null) { max = Math.max(max, fuzzyScore); hasAny = true; }
        if (phoneticScore != null) { max = Math.max(max, phoneticScore); hasAny = true; }
        if (embeddedScore != null) { max = Math.max(max, embeddedScore); hasAny = true; }
        if (hasAny) {
            return max;
        }
        return similarity != null ? similarity : 0.0;
    }

    public void setSimilarity(Double similarity) {
        this.similarity = similarity;
    }

    public String getMatchType() {
        if (matchTypes != null && !matchTypes.isEmpty()) {
            return String.join("_AND_", matchTypes);
        }
        return matchType != null ? matchType : "NONE";
    }

    public void setMatchType(String matchType) {
        this.matchType = matchType;
    }

    public Double getFuzzyScore() {
        return fuzzyScore;
    }

    public void setFuzzyScore(Double fuzzyScore) {
        this.fuzzyScore = fuzzyScore;
    }

    public Double getPhoneticScore() {
        return phoneticScore;
    }

    public void setPhoneticScore(Double phoneticScore) {
        this.phoneticScore = phoneticScore;
    }

    public Double getEmbeddedScore() {
        return embeddedScore;
    }

    public void setEmbeddedScore(Double embeddedScore) {
        this.embeddedScore = embeddedScore;
    }

    public List<String> getMatchTypes() {
        return matchTypes;
    }

    public void setMatchTypes(List<String> matchTypes) {
        this.matchTypes = matchTypes;
    }
}
