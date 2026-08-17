package com.sih.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class VectorSearchResponseDto {
    private String model;
    private int dimensions;
    private String metric;
    private List<VectorSearchCandidateDto> candidates = new ArrayList<>();

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public int getDimensions() {
        return dimensions;
    }

    public void setDimensions(int dimensions) {
        this.dimensions = dimensions;
    }

    public String getMetric() {
        return metric;
    }

    public void setMetric(String metric) {
        this.metric = metric;
    }

    public List<VectorSearchCandidateDto> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<VectorSearchCandidateDto> candidates) {
        this.candidates = candidates == null ? new ArrayList<>() : candidates;
    }
}
