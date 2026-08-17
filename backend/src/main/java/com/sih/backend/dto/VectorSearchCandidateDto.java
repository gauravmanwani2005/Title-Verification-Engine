package com.sih.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VectorSearchCandidateDto {
    @JsonProperty("registration_id")
    private String registrationId;

    private String title;
    private String language;

    @JsonProperty("vector_similarity")
    private double vectorSimilarity;

    public String getRegistrationId() {
        return registrationId;
    }

    public void setRegistrationId(String registrationId) {
        this.registrationId = registrationId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public double getVectorSimilarity() {
        return vectorSimilarity;
    }

    public void setVectorSimilarity(double vectorSimilarity) {
        this.vectorSimilarity = vectorSimilarity;
    }
}
