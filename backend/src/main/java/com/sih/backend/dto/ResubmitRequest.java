package com.sih.backend.dto;

public class ResubmitRequest {
    private String newTitle;
    private String language;

    public ResubmitRequest() {}

    public ResubmitRequest(String newTitle, String language) {
        this.newTitle = newTitle;
        this.language = language;
    }

    public String getNewTitle() {
        return newTitle;
    }

    public void setNewTitle(String newTitle) {
        this.newTitle = newTitle;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }
}
