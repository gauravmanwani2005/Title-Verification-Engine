package com.sih.backend.dto;

/**
 * Request body for POST /api/titles/{submissionId}/decision
 *
 * decision : "ACCEPTED" or "REJECTED"
 * officerId: identifier of the officer making the call
 * note     : optional plain-English reason
 */
public class OfficerDecisionRequest {

    private String decision;   // ACCEPTED | REJECTED
    private String officerId;
    private String note;

    public OfficerDecisionRequest() {}

    public String getDecision()              { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public String getOfficerId()               { return officerId; }
    public void setOfficerId(String officerId) { this.officerId = officerId; }

    public String getNote()          { return note; }
    public void setNote(String note) { this.note = note; }
}
