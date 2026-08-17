package com.sih.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "submission")
public class Submission {

    @Id
    private String id; // UUID

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "language", nullable = false)
    private String language;

    @Column(name = "applicant_id", nullable = false)
    private String applicantId;

    @Column(name = "verdict", nullable = false)
    private String verdict;

    @Column(name = "verification_probability", nullable = false)
    private double verificationProbability;

    @Column(name = "similarity_score", nullable = false)
    private double similarityScore;

    @Column(name = "reasons", columnDefinition = "TEXT")
    private String reasons; // Stored as JSON or text format

    @Column(name = "matched_titles", columnDefinition = "TEXT")
    private String matchedTitles; // Stored as JSON format

    @Column(name = "rule_violations", columnDefinition = "TEXT")
    private String ruleViolations; // Stored as JSON format

    @Column(name = "ai_call_invoked", nullable = false)
    private boolean aiCallInvoked;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Submission() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public double getVerificationProbability() {
        return verificationProbability;
    }

    public void setVerificationProbability(double verificationProbability) {
        this.verificationProbability = verificationProbability;
    }

    public double getSimilarityScore() {
        return similarityScore;
    }

    public void setSimilarityScore(double similarityScore) {
        this.similarityScore = similarityScore;
    }

    public String getReasons() {
        return reasons;
    }

    public void setReasons(String reasons) {
        this.reasons = reasons;
    }

    public String getMatchedTitles() {
        return matchedTitles;
    }

    public void setMatchedTitles(String matchedTitles) {
        this.matchedTitles = matchedTitles;
    }

    public String getRuleViolations() {
        return ruleViolations;
    }

    public void setRuleViolations(String ruleViolations) {
        this.ruleViolations = ruleViolations;
    }

    public boolean isAiCallInvoked() {
        return aiCallInvoked;
    }

    public void setAiCallInvoked(boolean aiCallInvoked) {
        this.aiCallInvoked = aiCallInvoked;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
