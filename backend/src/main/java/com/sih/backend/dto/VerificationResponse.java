package com.sih.backend.dto;

import java.util.List;

public class VerificationResponse {
    private String submissionId;
    private String verdict; // APPROVED or REJECTED
    private double verificationProbability;
    private double similarityScore;
    private List<String> reasons;
    private List<MatchedTitleDto> matchedTitles;
    private List<String> ruleViolations;
    private boolean aiCallInvoked;

    public VerificationResponse() {}

    public VerificationResponse(String submissionId, String verdict, double verificationProbability, 
                                double similarityScore, List<String> reasons, List<MatchedTitleDto> matchedTitles, 
                                List<String> ruleViolations, boolean aiCallInvoked) {
        this.submissionId = submissionId;
        this.verdict = verdict;
        this.verificationProbability = verificationProbability;
        this.similarityScore = similarityScore;
        this.reasons = reasons;
        this.matchedTitles = matchedTitles;
        this.ruleViolations = ruleViolations;
        this.aiCallInvoked = aiCallInvoked;
    }

    public String getSubmissionId() {
        return submissionId;
    }

    public void setSubmissionId(String submissionId) {
        this.submissionId = submissionId;
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

    public List<String> getReasons() {
        return reasons;
    }

    public void setReasons(List<String> reasons) {
        this.reasons = reasons;
    }

    public List<MatchedTitleDto> getMatchedTitles() {
        return matchedTitles;
    }

    public void setMatchedTitles(List<MatchedTitleDto> matchedTitles) {
        this.matchedTitles = matchedTitles;
    }

    public List<String> getRuleViolations() {
        return ruleViolations;
    }

    public void setRuleViolations(List<String> ruleViolations) {
        this.ruleViolations = ruleViolations;
    }

    public boolean isAiCallInvoked() {
        return aiCallInvoked;
    }

    public void setAiCallInvoked(boolean aiCallInvoked) {
        this.aiCallInvoked = aiCallInvoked;
    }
}
