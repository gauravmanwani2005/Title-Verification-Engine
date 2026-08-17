package com.sih.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.backend.client.AiClient;
import com.sih.backend.dto.MatchedTitleDto;
import com.sih.backend.dto.VerificationRequest;
import com.sih.backend.dto.VerificationResponse;
import com.sih.backend.model.Submission;
import com.sih.backend.model.Title;
import com.sih.backend.repository.SubmissionRepository;
import com.sih.backend.repository.TitleRepository;
import com.sih.backend.util.TransliterationHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class VerificationService {

    @Autowired
    private RuleEngine ruleEngine;

    @Autowired
    private PhoneticService phoneticService;

    @Autowired
    private TitleRepository titleRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private SimilarityScorer similarityScorer;

    @Autowired
    private AiClient aiClient;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Executes the verification pipeline for a new title submission.
     */
    public VerificationResponse verify(VerificationRequest request) {
        String rawTitle = request.getTitle();
        String language = request.getLanguage();
        String applicantId = request.getApplicantId();

        // 1. Normalize title (Devanagari -> Latin transliteration + normalization)
        String normalized = TransliterationHelper.normalize(rawTitle);

        // 2. Run rule engine (Blocklists, combinations, periodicity)
        List<String> ruleViolations = ruleEngine.check(normalized);

        String submissionId = UUID.randomUUID().toString();
        List<String> reasons = new ArrayList<>();
        List<MatchedTitleDto> matchedTitles = new ArrayList<>();
        boolean aiCallInvoked = false;
        double topSimilarity = 0.0;

        if (!ruleViolations.isEmpty()) {
            // Rule violations: Reject immediately, skipping candidate search and AI calls
            reasons.addAll(ruleViolations);
            return saveAndReturnResponse(
                    submissionId, rawTitle, language, applicantId,
                    "REJECTED", 0.0, 0.0,
                    reasons, matchedTitles, ruleViolations, false
            );
        }

        // 3. Candidate Generation (MySQL FULLTEXT ngram search + phonetic index lookup)
        String phoneticKey = phoneticService.computePhoneticKey(normalized);
        List<Title> fuzzyMatches = titleRepository.findFuzzyMatches(normalized);
        List<Title> phoneticMatches = titleRepository.findByPhoneticKey(phoneticKey);

        Set<Long> phoneticIds = phoneticMatches.stream().map(Title::getId).collect(Collectors.toSet());
        Set<Long> fuzzyIds = fuzzyMatches.stream().map(Title::getId).collect(Collectors.toSet());

        // Merge candidates (unique by ID)
        List<Title> candidates = Stream.concat(fuzzyMatches.stream(), phoneticMatches.stream())
                .collect(Collectors.toMap(Title::getId, t -> t, (a, b) -> a))
                .values()
                .stream()
                .toList();

        Title topCandidate = null;

        // 4. Precise string similarity scoring (Jaro-Winkler + Levenshtein)
        for (Title candidate : candidates) {
            double similarity = similarityScorer.calculateSimilarity(normalized, candidate.getNormalizedText());
            
            String matchType = "FUZZY";
            if (phoneticIds.contains(candidate.getId()) && fuzzyIds.contains(candidate.getId())) {
                matchType = "FUZZY_AND_PHONETIC";
            } else if (phoneticIds.contains(candidate.getId())) {
                matchType = "PHONETIC";
            }

            MatchedTitleDto matchedDto = new MatchedTitleDto(candidate.getRawText(), similarity, matchType);
            matchedTitles.add(matchedDto);

            if (similarity > topSimilarity) {
                topSimilarity = similarity;
                topCandidate = candidate;
            }
        }

        // Sort matched titles by similarity score descending
        matchedTitles.sort(Comparator.comparingDouble(MatchedTitleDto::getSimilarity).reversed());

        // 5. Semantic similarity via external AI service (only if there is a likely candidate)
        if (topCandidate != null && topSimilarity > 40.0) {
            try {
                // Call AI microservice
                double semanticSimilarity = aiClient.getSemanticSimilarity(normalized, topCandidate.getNormalizedText(), language);
                aiCallInvoked = true;

                // Scale 0.0-1.0 AI similarity score to percentage
                double semanticScorePercent = semanticSimilarity * 100.0;
                if (semanticScorePercent > topSimilarity) {
                    topSimilarity = semanticScorePercent;
                    // Prepend the semantic match to the front of matched list
                    matchedTitles.add(0, new MatchedTitleDto(topCandidate.getRawText(), semanticScorePercent, "SEMANTIC"));
                }
            } catch (Exception e) {
                // Fault-tolerant fallback handled by CircuitBreaker
            }
        }

        // 6. Aggregate scores
        double verificationProbability = 100.0 - topSimilarity;
        verificationProbability = Math.max(0.0, Math.min(100.0, verificationProbability));

        // Define verdict threshold (e.g. similarity >= 50% leads to rejection)
        String verdict = "APPROVED";
        if (verificationProbability < 50.0) {
            verdict = "REJECTED";
            if (topCandidate != null) {
                reasons.add(String.format("Phonetically or structurally similar to existing title '%s' (%.1f%% match)", 
                        topCandidate.getRawText(), topSimilarity));
            }
        } else {
            reasons.add("No significant similarity conflicts found with existing titles.");
        }

        return saveAndReturnResponse(
                submissionId, rawTitle, language, applicantId,
                verdict, verificationProbability, topSimilarity,
                reasons, matchedTitles, ruleViolations, aiCallInvoked
        );
    }

    /**
     * Fetches a historical submission result.
     */
    public VerificationResponse getSubmission(String submissionId) {
        Submission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NoSuchElementException("Submission not found with ID: " + submissionId));
        return mapToResponse(sub);
    }

    private VerificationResponse saveAndReturnResponse(
            String id, String title, String language, String applicantId,
            String verdict, double verificationProbability, double similarityScore,
            List<String> reasons, List<MatchedTitleDto> matchedTitles,
            List<String> ruleViolations, boolean aiCallInvoked) {

        Submission submission = new Submission();
        submission.setId(id);
        submission.setTitle(title);
        submission.setLanguage(language);
        submission.setApplicantId(applicantId);
        submission.setVerdict(verdict);
        submission.setVerificationProbability(verificationProbability);
        submission.setSimilarityScore(similarityScore);
        submission.setAiCallInvoked(aiCallInvoked);

        try {
            submission.setReasons(objectMapper.writeValueAsString(reasons));
            submission.setMatchedTitles(objectMapper.writeValueAsString(matchedTitles));
            submission.setRuleViolations(objectMapper.writeValueAsString(ruleViolations));
        } catch (JsonProcessingException e) {
            submission.setReasons("[]");
            submission.setMatchedTitles("[]");
            submission.setRuleViolations("[]");
        }

        submissionRepository.save(submission);

        return new VerificationResponse(
                id, verdict, verificationProbability, similarityScore,
                reasons, matchedTitles, ruleViolations, aiCallInvoked
        );
    }

    private VerificationResponse mapToResponse(Submission sub) {
        List<String> reasons;
        List<MatchedTitleDto> matchedTitles;
        List<String> ruleViolations;

        try {
            reasons = objectMapper.readValue(sub.getReasons(), new TypeReference<List<String>>() {});
            matchedTitles = objectMapper.readValue(sub.getMatchedTitles(), new TypeReference<List<MatchedTitleDto>>() {});
            ruleViolations = objectMapper.readValue(sub.getRuleViolations(), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            reasons = Collections.emptyList();
            matchedTitles = Collections.emptyList();
            ruleViolations = Collections.emptyList();
        }

        return new VerificationResponse(
                sub.getId(), sub.getVerdict(), sub.getVerificationProbability(),
                sub.getSimilarityScore(), reasons, matchedTitles, ruleViolations,
                sub.isAiCallInvoked()
        );
    }
}
