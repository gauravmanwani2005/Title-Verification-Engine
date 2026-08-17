package com.sih.backend.dto;

public class VerificationRequest {
    private String title;
    private String language;
    private String applicantId;

    public VerificationRequest() {}

    public VerificationRequest(String title, String language, String applicantId) {
        this.title = title;
        this.language = language;
        this.applicantId = applicantId;
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

    public String getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(String applicantId) {
        this.applicantId = applicantId;
    }
}
