package com.sih.backend.dto;

public class VectorCandidate {
    private Long titleId;
    private String title;
    private int rank;
    private double similarity;

    public VectorCandidate() {}

    public VectorCandidate(Long titleId, String title, int rank, double similarity) {
        this.titleId = titleId;
        this.title = title;
        this.rank = rank;
        this.similarity = similarity;
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

    public int getRank() {
        return rank;
    }

    public void setRank(int rank) {
        this.rank = rank;
    }

    public double getSimilarity() {
        return similarity;
    }

    public void setSimilarity(double similarity) {
        this.similarity = similarity;
    }
}
