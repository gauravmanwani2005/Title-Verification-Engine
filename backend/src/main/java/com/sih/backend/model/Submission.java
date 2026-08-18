package com.sih.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Submission audit record.
 *
 * Stores all pipeline scores separately for auditability:
 *   top_embedding_score  — best Member 1 (LaBSE) score across candidates
 *   top_semantic_score   — best Member 2 (Gemini) score across candidates
 *   final_score          — score used for the 3-way decision
 *   similarity_score     — alias for final_score (backward compat)
 *   member1_model        — Member 1 model identifier
 *   member2_model        — Member 2 model identifier
 */
@Entity
@Table(name = "submission")
public class Submission {

    @Id
    private String id;

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

    /** Final score used for the 3-way decision (0–100). Stored as similarity_score for backward compat. */
    @Column(name = "similarity_score", nullable = false)
    private double similarityScore;

    /** Best Member 1 (LaBSE) embeddingScore across all top-K candidates. */
    @Column(name = "top_embedding_score")
    private Double topEmbeddingScore;

    /** Best Member 2 (Gemini) semanticScore across all top-K candidates. */
    @Column(name = "top_semantic_score")
    private Double topSemanticScore;

    /** Explicit finalScore = max(topEmbeddingScore, topSemanticScore). */
    @Column(name = "final_score")
    private Double finalScore;

    /** Member 1 model version for auditability. */
    @Column(name = "member1_model", length = 100)
    private String member1Model;

    /** Member 2 model version for auditability. */
    @Column(name = "member2_model", length = 100)
    private String member2Model;

    @Column(name = "reasons", columnDefinition = "TEXT")
    private String reasons;

    @Column(name = "matched_titles", columnDefinition = "TEXT")
    private String matchedTitles;

    @Column(name = "rule_violations", columnDefinition = "TEXT")
    private String ruleViolations;

    @Column(name = "ai_call_invoked", nullable = false)
    private boolean aiCallInvoked;

    /** Officer final decision — only set for REVIEW verdicts. Values: ACCEPTED, REJECTED */
    @Column(name = "officer_decision", length = 20)
    private String officerDecision;

    /** Officer ID who made the final decision. */
    @Column(name = "officer_id", length = 100)
    private String officerId;

    /** Officer's note / reason for their decision. */
    @Column(name = "officer_note", columnDefinition = "TEXT")
    private String officerNote;

    /** Timestamp when officer made the final decision. */
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Submission() {}

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public String getId()                       { return id; }
    public void setId(String id)                { this.id = id; }

    public String getTitle()                    { return title; }
    public void setTitle(String title)          { this.title = title; }

    public String getLanguage()                 { return language; }
    public void setLanguage(String language)    { this.language = language; }

    public String getApplicantId()                          { return applicantId; }
    public void setApplicantId(String applicantId)          { this.applicantId = applicantId; }

    public String getVerdict()                  { return verdict; }
    public void setVerdict(String verdict)      { this.verdict = verdict; }

    public double getVerificationProbability()                                  { return verificationProbability; }
    public void setVerificationProbability(double verificationProbability)      { this.verificationProbability = verificationProbability; }

    public double getSimilarityScore()                          { return similarityScore; }
    public void setSimilarityScore(double similarityScore)      { this.similarityScore = similarityScore; }

    public Double getTopEmbeddingScore()                            { return topEmbeddingScore; }
    public void setTopEmbeddingScore(Double topEmbeddingScore)      { this.topEmbeddingScore = topEmbeddingScore; }

    public Double getTopSemanticScore()                         { return topSemanticScore; }
    public void setTopSemanticScore(Double topSemanticScore)    { this.topSemanticScore = topSemanticScore; }

    public Double getFinalScore()                   { return finalScore; }
    public void setFinalScore(Double finalScore)    { this.finalScore = finalScore; }

    public String getMember1Model()                     { return member1Model; }
    public void setMember1Model(String member1Model)    { this.member1Model = member1Model; }

    public String getMember2Model()                     { return member2Model; }
    public void setMember2Model(String member2Model)    { this.member2Model = member2Model; }

    public String getReasons()                  { return reasons; }
    public void setReasons(String reasons)      { this.reasons = reasons; }

    public String getMatchedTitles()                        { return matchedTitles; }
    public void setMatchedTitles(String matchedTitles)      { this.matchedTitles = matchedTitles; }

    public String getRuleViolations()                           { return ruleViolations; }
    public void setRuleViolations(String ruleViolations)        { this.ruleViolations = ruleViolations; }

    public boolean isAiCallInvoked()                        { return aiCallInvoked; }
    public void setAiCallInvoked(boolean aiCallInvoked)     { this.aiCallInvoked = aiCallInvoked; }

    public String getOfficerDecision()                          { return officerDecision; }
    public void setOfficerDecision(String officerDecision)      { this.officerDecision = officerDecision; }

    public String getOfficerId()                    { return officerId; }
    public void setOfficerId(String officerId)      { this.officerId = officerId; }

    public String getOfficerNote()                      { return officerNote; }
    public void setOfficerNote(String officerNote)      { this.officerNote = officerNote; }

    public LocalDateTime getDecidedAt()                     { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt)       { this.decidedAt = decidedAt; }

    public LocalDateTime getCreatedAt()                     { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)       { this.createdAt = createdAt; }
}
