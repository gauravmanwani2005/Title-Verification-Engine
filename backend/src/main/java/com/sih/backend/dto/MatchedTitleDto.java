package com.sih.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MatchedTitleDto {
    private Long titleId;
    private String title;
    private double fuzzyScore;
    private double phoneticScore;
    private double embeddedScore;
    private List<String> matchTypes = new ArrayList<>();

    @JsonIgnore
    private Double legacySimilarity;

    @JsonIgnore
    private String legacyMatchType;

    public MatchedTitleDto() {}

    public MatchedTitleDto(Long titleId, String title) {
        this.titleId = titleId;
        this.title = title;
    }

    public Long getTitleId() {
        return titleId;
    }

    public void setTitleId(Long titleId) {
        this.titleId = titleId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public double getFuzzyScore() {
        return fuzzyScore;
    }

    public void setFuzzyScore(double fuzzyScore) {
        this.fuzzyScore = fuzzyScore;
    }

    public double getPhoneticScore() {
        return phoneticScore;
    }

    public void setPhoneticScore(double phoneticScore) {
        this.phoneticScore = phoneticScore;
    }

    public double getEmbeddedScore() {
        return embeddedScore;
    }

    public void setEmbeddedScore(double embeddedScore) {
        this.embeddedScore = embeddedScore;
    }

    public List<String> getMatchTypes() {
        return matchTypes;
    }

    public void setMatchTypes(List<String> matchTypes) {
        this.matchTypes = matchTypes == null ? new ArrayList<>() : new ArrayList<>(new LinkedHashSet<>(matchTypes));
    }

    public void addMatchType(String matchType) {
        if (matchType == null || matchType.isBlank()) {
            return;
        }
        LinkedHashSet<String> deduped = new LinkedHashSet<>(matchTypes);
        deduped.add(matchType);
        this.matchTypes = new ArrayList<>(deduped);
    }

    @JsonProperty("similarity")
    public void setLegacySimilarity(Double similarity) {
        this.legacySimilarity = similarity;
        applyLegacyValues();
    }

    @JsonProperty("matchType")
    public void setLegacyMatchType(String matchType) {
        this.legacyMatchType = matchType;
        applyLegacyValues();
    }

    @JsonIgnore
    public double getSimilarity() {
        return Math.max(fuzzyScore, Math.max(phoneticScore, embeddedScore));
    }

    private void applyLegacyValues() {
        if (legacySimilarity == null || legacyMatchType == null) {
            return;
        }

        switch (legacyMatchType) {
            case "PHONETIC" -> setPhoneticScore(legacySimilarity);
            case "SEMANTIC", "EMBEDDED" -> setEmbeddedScore(legacySimilarity);
            default -> setFuzzyScore(legacySimilarity);
        }
        addMatchType(legacyMatchType);
    }
}
