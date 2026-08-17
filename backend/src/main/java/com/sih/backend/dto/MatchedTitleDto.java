package com.sih.backend.dto;

public class MatchedTitleDto {
    private String title;
    private double similarity;
    private String matchType; // PHONETIC or FUZZY or SEMANTIC

    public MatchedTitleDto() {}

    public MatchedTitleDto(String title, double similarity, String matchType) {
        this.title = title;
        this.similarity = similarity;
        this.matchType = matchType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public double getSimilarity() {
        return similarity;
    }

    public void setSimilarity(double similarity) {
        this.similarity = similarity;
    }

    public String getMatchType() {
        return matchType;
    }

    public void setMatchType(String matchType) {
        this.matchType = matchType;
    }
}
