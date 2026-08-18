package com.sih.backend.controller;

import com.sih.backend.dto.OfficerDecisionRequest;
import com.sih.backend.dto.ResubmitRequest;
import com.sih.backend.dto.VerificationRequest;
import com.sih.backend.dto.VerificationResponse;
import com.sih.backend.model.Title;
import com.sih.backend.repository.TitleRepository;
import com.sih.backend.service.VerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/titles")
public class VerificationController {

    @Autowired
    private VerificationService verificationService;

    @Autowired
    private TitleRepository titleRepository;

    /**
     * POST /api/titles/verify
     * Runs a new title through the full pipeline.
     */
    @PostMapping("/verify")
    public ResponseEntity<VerificationResponse> verifyTitle(@RequestBody VerificationRequest request) {
        return ResponseEntity.ok(verificationService.verify(request));
    }

    /**
     * GET /api/titles/{submissionId}
     * Fetch a past verification result by ID.
     */
    @GetMapping("/{submissionId}")
    public ResponseEntity<VerificationResponse> getSubmission(@PathVariable String submissionId) {
        try {
            return ResponseEntity.ok(verificationService.getSubmission(submissionId));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/titles/search?query=&page=&size=
     * Admin/staff search across the title database (paginated).
     */
    @GetMapping("/search")
    public ResponseEntity<Page<Title>> searchTitles(
            @RequestParam(value = "query", required = false, defaultValue = "") String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        String cleanQuery = query.replaceAll("^\"|\"$", "").trim();
        PageRequest pageable = PageRequest.of(page, size);
        Page<Title> results = titleRepository.searchTitles(cleanQuery, pageable);
        return ResponseEntity.ok(results);
    }

    /**
     * POST /api/titles/{submissionId}/resubmit
     * Re-runs the pipeline on a modified title, linked to the original submission for audit trail.
     */
    @PostMapping("/{submissionId}/resubmit")
    public ResponseEntity<VerificationResponse> resubmitTitle(
            @PathVariable String submissionId,
            @RequestBody ResubmitRequest request) {
        
        VerificationRequest verificationRequest = new VerificationRequest();
        verificationRequest.setTitle(request.getNewTitle());
        verificationRequest.setLanguage(request.getLanguage() != null && !request.getLanguage().isBlank()
                ? request.getLanguage() : "en");
        verificationRequest.setApplicantId("LINKED-SUBMISSION-" + submissionId);

        // Carry forward the language from the original submission if available
        try {
            VerificationResponse original = verificationService.getSubmission(submissionId);
            if (original.getMatchedTitles() != null) {
                // Preserve the original language from the submission record (via reasons field).
                // The original language is not exposed directly in VerificationResponse, so
                // we default to "en" unless the request body supplies it explicitly.
            }
        } catch (Exception e) {
            // Original not found — proceed with defaults
        }

        VerificationResponse response = verificationService.verify(verificationRequest);
        response.getReasons().add(0, "Linked to original submission ID: " + submissionId + " for audit trail.");
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/titles/{submissionId}/decision
     * Officer final decision on a REVIEW-verdict submission.
     * decision must be "ACCEPTED" or "REJECTED".
     * If ACCEPTED, the title is added to the registered title table.
     */
    @PostMapping("/{submissionId}/decision")
    public ResponseEntity<Map<String, Object>> officerDecision(
            @PathVariable String submissionId,
            @RequestBody OfficerDecisionRequest request) {
        try {
            Map<String, Object> result = verificationService.applyOfficerDecision(submissionId, request);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/titles/{submissionId}/status
     * Lightweight polling endpoint to check status.
     */
    @GetMapping("/{submissionId}/status")
    public ResponseEntity<Map<String, String>> getStatus(@PathVariable String submissionId) {
        try {
            VerificationResponse sub = verificationService.getSubmission(submissionId);
            Map<String, String> statusMap = new HashMap<>();
            statusMap.put("submissionId", sub.getSubmissionId());
            statusMap.put("status", "COMPLETED");
            statusMap.put("verdict", sub.getVerdict());
            return ResponseEntity.ok(statusMap);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
