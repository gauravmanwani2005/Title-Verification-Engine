package com.sih.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.backend.client.VectorSearchClient;
import com.sih.backend.dto.MatchedTitleDto;
import com.sih.backend.dto.VectorCandidate;
import com.sih.backend.dto.VerificationRequest;
import com.sih.backend.dto.VerificationResponse;
import com.sih.backend.model.Submission;
import com.sih.backend.model.Title;
import com.sih.backend.repository.SubmissionRepository;
import com.sih.backend.repository.TitleRepository;
import com.sih.backend.util.TransliterationHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

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
    private VectorSearchClient vectorSearchClient;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${candidate.fuzzy.retrieval.limit:100}")
    private int fuzzyRetrievalLimit;

    @Value("${candidate.phonetic.retrieval.limit:100}")
    private int phoneticRetrievalLimit;

    @Value("${candidate.embedding.retrieval.limit:100}")
    private int embeddingRetrievalLimit;

    /**
     * Executes the verification pipeline for a new title submission.
     */
    public VerificationResponse verify(VerificationRequest request) {
        String rawTitle = request.getTitle();
        String language = request.getLanguage();
        String applicantId = request.getApplicantId();

        String normalized = TransliterationHelper.normalize(rawTitle);
        List<String> ruleViolations = ruleEngine.check(normalized);

        String submissionId = UUID.randomUUID().toString();
        List<String> reasons = new ArrayList<>();
        List<MatchedTitleDto> matchedTitles = new ArrayList<>();
        boolean aiCallInvoked = false;

        if (!ruleViolations.isEmpty()) {
            reasons.addAll(ruleViolations);
            return saveAndReturnResponse(
                    submissionId, rawTitle, language, applicantId,
                    "REJECTED", 0.0, 0.0,
                    reasons, matchedTitles, ruleViolations, false
            );
        }

        String phoneticKey = phoneticService.computePhoneticKey(normalized);
        List<Title> fuzzyMatches = titleRepository.findFuzzyMatches(normalized, fuzzyRetrievalLimit);
        List<Title> phoneticMatches = titleRepository
                .findByPhoneticKey(phoneticKey, PageRequest.of(0, phoneticRetrievalLimit))
                .getContent();

        List<VectorCandidate> embeddedMatches;
        try {
            aiCallInvoked = true;
            embeddedMatches = vectorSearchClient.findNearestCandidates(normalized, language, embeddingRetrievalLimit);
        } catch (Exception e) {
            log.warn("AI/vector retrieval unavailable. Continuing with fuzzy + phonetic candidates. {}", e.getMessage());
            embeddedMatches = Collections.emptyList();
        }

        Map<Long, MatchedTitleDto> candidatePool = new LinkedHashMap<>();
        for (Title fuzzyMatch : fuzzyMatches) {
            MatchedTitleDto dto = candidatePool.computeIfAbsent(
                    fuzzyMatch.getId(),
                    ignored -> new MatchedTitleDto(fuzzyMatch.getId(), fuzzyMatch.getRawText())
            );
            dto.setFuzzyScore(similarityScorer.calculateSimilarity(normalized, fuzzyMatch.getNormalizedText()));
            dto.addMatchType("FUZZY");
        }

        for (Title phoneticMatch : phoneticMatches) {
            MatchedTitleDto dto = candidatePool.computeIfAbsent(
                    phoneticMatch.getId(),
                    ignored -> new MatchedTitleDto(phoneticMatch.getId(), phoneticMatch.getRawText())
            );
            dto.setPhoneticScore(calculatePhoneticScore(normalized, phoneticMatch.getNormalizedText()));
            dto.addMatchType("PHONETIC");
        }

        for (VectorCandidate embeddedMatch : embeddedMatches) {
            MatchedTitleDto dto = candidatePool.computeIfAbsent(
                    embeddedMatch.getTitleId(),
                    ignored -> new MatchedTitleDto(embeddedMatch.getTitleId(), embeddedMatch.getTitle())
            );
            dto.setEmbeddedScore(embeddedMatch.getSimilarity());
            dto.addMatchType("EMBEDDED");
        }

        matchedTitles = candidatePool.values().stream()
                .sorted(Comparator.comparingDouble(MatchedTitleDto::getSimilarity).reversed())
                .toList();

        return saveAndReturnResponse(
                submissionId, rawTitle, language, applicantId,
                "", 0.0, 0.0,
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

    private double calculatePhoneticScore(String normalizedInput, String candidateNormalizedText) {
        String inputKey = phoneticService.computePhoneticKey(normalizedInput);
        String candidateKey = phoneticService.computePhoneticKey(candidateNormalizedText);
        if (!inputKey.isBlank() && inputKey.equals(candidateKey)) {
            return 100.0;
        }
        return similarityScorer.calculateSimilarity(inputKey, candidateKey);
    }
}
