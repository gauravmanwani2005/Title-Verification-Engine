package com.sih.backend.dto;

public class ResubmitRequest {
    private String newTitle;

    public ResubmitRequest() {}

    public ResubmitRequest(String newTitle) {
        this.newTitle = newTitle;
    }

    public String getNewTitle() {
        return newTitle;
    }

    public void setNewTitle(String newTitle) {
        this.newTitle = newTitle;
    }
}
