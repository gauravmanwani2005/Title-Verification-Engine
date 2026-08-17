package com.sih.backend.dto;

public class VectorSearchRequestDto {
    private String title;
    private String language;
    private int limit;

    public VectorSearchRequestDto() {}

    public VectorSearchRequestDto(String title, String language, int limit) {
        this.title = title;
        this.language = language;
        this.limit = limit;
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

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }
}
