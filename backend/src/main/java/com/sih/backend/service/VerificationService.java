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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    private AiClient aiClient;

    @Autowired
    private ObjectMapper objectMapper;

    // ─── Retrieval Limits (how many raw candidates to fetch from DB per mechanism) ───
    @Value("${candidate.fuzzy.retrieval.limit:100}")
    private int fuzzyRetrievalLimit;

    @Value("${candidate.phonetic.retrieval.limit:100}")
    private int phoneticRetrievalLimit;

    @Value("${candidate.embedding.retrieval.limit:50}")
    private int embeddingRetrievalLimit;

    @Value("${candidate.ai.scoring.limit:20}")
    private int aiScoringLimit;

    // ─── Response Filter Thresholds (a candidate must pass at least ONE to appear in response) ───
    @Value("${candidate.fuzzy.threshold:50.0}")
    private double fuzzyThreshold;

    @Value("${candidate.phonetic.threshold:75.0}")
    private double phoneticThreshold;

    @Value("${candidate.embedding.threshold:70.0}")
    private double embeddingThreshold;

    /**
     * Executes the full verification pipeline for a new title submission.
     *
     * Pipeline:
     *  1. Normalize / transliterate
     *  2. Rule engine (hard reject on violations)
     *  3. Candidate retrieval from DB (fuzzy FULLTEXT + phonetic index)
     *  4. Deduplicate by titleId
     *  5. Calculate fuzzy + phonetic scores independently for every candidate
     *  6. Send top-N candidates to AI for embedded/semantic scoring
     *  7. Apply response filter thresholds — include if ANY score >= its threshold
     *  8. Sort by max(score) descending, return ALL qualifying candidates
     */
    public VerificationResponse verify(VerificationRequest request) {
        String rawTitle = request.getTitle();
        String language = request.getLanguage();
        String applicantId = request.getApplicantId();

        // 1. Normalize (Devanagari → Latin transliteration + lowercase + strip punctuation)
        String normalized = TransliterationHelper.normalize(rawTitle);
        log.info("Verifying title: '{}' → normalized: '{}'", rawTitle, normalized);

        // 2. Hard rule checks (blocklist words, affixes, periodicity, combinations)
        List<String> ruleViolations = ruleEngine.check(normalized);
        String submissionId = UUID.randomUUID().toString();
        List<String> reasons = new ArrayList<>();
        boolean aiCallInvoked = false;

        if (!ruleViolations.isEmpty()) {
            reasons.addAll(ruleViolations);
            return saveAndReturnResponse(
                    submissionId, rawTitle, language, applicantId,
                    "REJECTED", 0.0, 0.0,
                    reasons, Collections.emptyList(), ruleViolations, false
            );
        }

        // 3. Candidate Retrieval — limited for DB performance, NOT for final response
        String phoneticKey = phoneticService.computePhoneticKey(normalized);

        List<Title> fuzzyCandidates = titleRepository.findFuzzyMatches(normalized, fuzzyRetrievalLimit);

        List<Title> phoneticCandidates = titleRepository.findByPhoneticKey(phoneticKey)
                .stream().limit(phoneticRetrievalLimit).toList();

        List<Title> vectorCandidates;
        try {
            List<String> vectorTitles = aiClient.getVectorCandidates(normalized, language, embeddingRetrievalLimit);
            if (vectorTitles != null && !vectorTitles.isEmpty()) {
                vectorCandidates = titleRepository.findAll().stream()
                        .filter(t -> vectorTitles.contains(t.getRawText()) || vectorTitles.contains(t.getNormalizedText()))
                        .toList();
            } else {
                throw new RuntimeException("No vector titles returned or service fallback triggered empty list");
            }
        } catch (Exception e) {
            log.warn("Vector search failed, falling back to local Cosine Similarity candidate retrieval: {}", e.getMessage());
            org.apache.commons.text.similarity.CosineSimilarity cosine = new org.apache.commons.text.similarity.CosineSimilarity();
            Map<CharSequence, Integer> queryFreqs = getTermFrequencies(normalized);

            vectorCandidates = titleRepository.findAll().stream()
                    .map(t -> {
                        double sim = 0.0;
                        try {
                            sim = cosine.cosineSimilarity(queryFreqs, getTermFrequencies(t.getNormalizedText()));
                        } catch (Exception ignored) {}
                        return new AbstractMap.SimpleEntry<>(t, sim);
                    })
                    .filter(entry -> entry.getValue() >= 0.5)
                    .sorted((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()))
                    .limit(embeddingRetrievalLimit)
                    .map(Map.Entry::getKey)
                    .toList();
        }

        Set<Long> fuzzyIds = fuzzyCandidates.stream().map(Title::getId).collect(Collectors.toSet());
        Set<Long> phoneticIds = phoneticCandidates.stream().map(Title::getId).collect(Collectors.toSet());
        Set<Long> vectorIds = vectorCandidates.stream().map(Title::getId).collect(Collectors.toSet());

        log.info("Candidate retrieval: fuzzy={}, phonetic={}, vector={}", fuzzyCandidates.size(), phoneticCandidates.size(), vectorCandidates.size());

        // 4. Deduplicate by titleId into a single candidate pool (LinkedHashMap preserves insertion order)
        Map<Long, Title> candidatePoolMap = new LinkedHashMap<>();
        for (Title t : fuzzyCandidates) {
            candidatePoolMap.put(t.getId(), t);
        }
        for (Title t : phoneticCandidates) {
            candidatePoolMap.putIfAbsent(t.getId(), t);
        }
        for (Title t : vectorCandidates) {
            candidatePoolMap.putIfAbsent(t.getId(), t);
        }

        log.info("Deduplicated candidate pool size: {}", candidatePoolMap.size());

        // 5. Calculate fuzzy and phonetic scores INDEPENDENTLY for every candidate in the pool
        //    Scores are always calculated — threshold filtering happens later (step 7)
        List<MatchedTitleDto> scoredCandidates = new ArrayList<>();
        for (Title candidate : candidatePoolMap.values()) {

            // Fuzzy score (Jaro-Winkler + Levenshtein average)
            double fuzzySim = similarityScorer.calculateSimilarity(normalized, candidate.getNormalizedText());

            // Phonetic score — exact key match = 100.0, otherwise key-to-key similarity
            String candidatePhoneticKey = candidate.getPhoneticKey();
            if (candidatePhoneticKey == null || candidatePhoneticKey.isBlank()) {
                candidatePhoneticKey = phoneticService.computePhoneticKey(candidate.getNormalizedText());
            }
            double phoneticSim;
            if (phoneticIds.contains(candidate.getId())) {
                // Exact phonetic key match from DB index — score 100.0
                phoneticSim = 100.0;
            } else {
                phoneticSim = similarityScorer.calculateSimilarity(phoneticKey, candidatePhoneticKey);
            }

            List<String> matchTypes = new ArrayList<>();
            // Track match origin (used later for matchTypes label), but do NOT filter here
            if (fuzzyIds.contains(candidate.getId())) matchTypes.add("FUZZY");
            if (phoneticIds.contains(candidate.getId())) matchTypes.add("PHONETIC");
            if (vectorIds.contains(candidate.getId())) matchTypes.add("EMBEDDED");

            scoredCandidates.add(new MatchedTitleDto(
                    candidate.getRawText(),
                    fuzzySim,          // always set — threshold filtering is in step 7
                    phoneticSim,       // always set
                    null,              // embeddedScore populated in step 6
                    matchTypes
            ));
        }

        // 6. AI / Embedding scoring — limited to top-N candidates for cost/latency control
        //    Rank the COMPLETE candidate pool using the strongest non-AI score first.
        List<MatchedTitleDto> candidatesForAi = scoredCandidates.stream()
                .sorted(
                        Comparator.comparingDouble(
                                (MatchedTitleDto dto) -> {
                                    double fuzzy = dto.getFuzzyScore() != null
                                            ? dto.getFuzzyScore()
                                            : 0.0;

                                    double phonetic = dto.getPhoneticScore() != null
                                            ? dto.getPhoneticScore()
                                            : 0.0;

                                    return Math.max(fuzzy, phonetic);
                                }
                        ).reversed()
                )
                .limit(aiScoringLimit)
                .toList();

        for (MatchedTitleDto dto : candidatesForAi) {
            try {
                double semanticSimilarity = aiClient.getSemanticSimilarity(
                        normalized,
                        TransliterationHelper.normalize(dto.getTitle()),
                        language,
                        dto.getFuzzyScore(),
                        dto.getPhoneticScore()
                );

                aiCallInvoked = true;

                double semanticPercent = semanticSimilarity * 100.0;

                dto.setEmbeddedScore(semanticPercent);

                if (semanticPercent >= embeddingThreshold
                        && !dto.getMatchTypes().contains("EMBEDDED")) {
                    dto.getMatchTypes().add("EMBEDDED");
                }

            } catch (Exception e) {
                log.debug(
                        "AI call failed for '{}': {}",
                        dto.getTitle(),
                        e.getMessage()
                );
            }
        }


        // 6b. Gemini semantic scoring (Member 2) — runs on same top-N candidates
        //     Blends Gemini score with LaBSE embeddedScore: max(labse, gemini*100)
        try {
            List<Map<String, Object>> geminiInput = candidatesForAi.stream()
                    .map(dto -> {
                        Map<String, Object> c = new HashMap<>();
                        c.put("registration_id", dto.getTitle());
                        c.put("title", dto.getTitle());
                        c.put("language", language);
                        c.put("embedding_similarity",
                                dto.getEmbeddedScore() != null ? dto.getEmbeddedScore() / 100.0 : 0.0);
                        return c;
                    })
                    .toList();

            List<Map<String, Object>> geminiResults =
                    aiClient.getGeminiSemanticScores(normalized, language, geminiInput);
            aiCallInvoked = true;

            // Build a map from title → gemini semantic_score for quick lookup
            Map<String, Double> geminiScoreMap = new HashMap<>();
            for (Map<String, Object> result : geminiResults) {
                String regId = (String) result.get("registration_id");
                Number score = (Number) result.get("semantic_score");
                if (regId != null && score != null) {
                    geminiScoreMap.put(regId, score.doubleValue() * 100.0);
                }
            }

            // Blend: use max(labse_embedded, gemini) as the final embeddedScore
            for (MatchedTitleDto dto : candidatesForAi) {
                Double geminiScore = geminiScoreMap.get(dto.getTitle());
                if (geminiScore != null) {
                    double current = dto.getEmbeddedScore() != null ? dto.getEmbeddedScore() : 0.0;
                    double blended = Math.max(current, geminiScore);
                    dto.setEmbeddedScore(blended);
                    if (blended >= embeddingThreshold && !dto.getMatchTypes().contains("GEMINI")) {
                        dto.getMatchTypes().add("GEMINI");
                    }
                    log.debug("Gemini score for '{}': {:.1f}% → blended: {:.1f}%",
                            dto.getTitle(), geminiScore, blended);
                }
            }
        } catch (Exception e) {
            log.debug("Gemini scoring skipped (not blocking): {}", e.getMessage());
        }

        // 7. Apply response filter thresholds:
        //    Include a candidate if it qualifies on AT LEAST ONE scoring dimension
        List<MatchedTitleDto> qualifyingCandidates = scoredCandidates.stream()
                .filter(dto -> {
                    boolean qualifyFuzzy    = dto.getFuzzyScore() != null    && dto.getFuzzyScore()    >= fuzzyThreshold;
                    boolean qualifyPhonetic = dto.getPhoneticScore() != null && dto.getPhoneticScore() >= phoneticThreshold;
                    boolean qualifyEmbedded = dto.getEmbeddedScore() != null && dto.getEmbeddedScore() >= embeddingThreshold;
                    return qualifyFuzzy || qualifyPhonetic || qualifyEmbedded;
                })
                // Populate matchTypes based on thresholds, keeping all calculated scores
                .peek(dto -> {
                    dto.getMatchTypes().clear();
                    if (dto.getFuzzyScore() != null && dto.getFuzzyScore() >= fuzzyThreshold) {
                        dto.getMatchTypes().add("FUZZY");
                    }
                    if (dto.getPhoneticScore() != null && dto.getPhoneticScore() >= phoneticThreshold) {
                        dto.getMatchTypes().add("PHONETIC");
                    }
                    if (dto.getEmbeddedScore() != null && dto.getEmbeddedScore() >= embeddingThreshold) {
                        dto.getMatchTypes().add("EMBEDDED");
                    }
                })
                .collect(Collectors.toList());

        log.info("Qualifying candidates after threshold filter: {}", qualifyingCandidates.size());

        // 8. Sort ALL qualifying candidates by max(fuzzyScore, phoneticScore, embeddedScore) descending
        qualifyingCandidates.sort(Comparator.comparingDouble(MatchedTitleDto::getSimilarity).reversed());

        // 9. Determine top similarity and verdict
        double topSimilarity = qualifyingCandidates.isEmpty() ? 0.0 :
                qualifyingCandidates.get(0).getSimilarity();

        double verificationProbability = Math.max(0.0, Math.min(100.0, 100.0 - topSimilarity));

        String verdict;
        if (verificationProbability < 50.0) {
            verdict = "REJECTED";
            if (!qualifyingCandidates.isEmpty()) {
                MatchedTitleDto top = qualifyingCandidates.get(0);
                if (qualifyingCandidates.size() == 1) {
                    reasons.add(String.format(
                            "Similar to existing title '%s' (%.1f%% match)",
                            top.getTitle(), topSimilarity));
                } else {
                    reasons.add(String.format(
                            "Multiple registered titles show significant similarity. Top match: '%s' (%.1f%%)",
                            top.getTitle(), topSimilarity));
                }
            }
        } else {
            verdict = "APPROVED";
            reasons.add("No significant similarity conflicts found with existing titles.");
        }

        return saveAndReturnResponse(
                submissionId, rawTitle, language, applicantId,
                verdict, verificationProbability, topSimilarity,
                reasons, qualifyingCandidates, ruleViolations, aiCallInvoked
        );
    }

    /**
     * Fetches a historical submission result by submission ID.
     */
    public VerificationResponse getSubmission(String submissionId) {
        Submission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NoSuchElementException("Submission not found: " + submissionId));
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

    private Map<CharSequence, Integer> getTermFrequencies(String text) {
        Map<CharSequence, Integer> frequencies = new HashMap<>();
        if (text == null || text.isBlank()) {
            return frequencies;
        }
        String normalized = text.trim().toLowerCase().replaceAll("\\s+", "");
        for (int i = 0; i <= normalized.length() - 3; i++) {
            String trigram = normalized.substring(i, i + 3);
            frequencies.put(trigram, frequencies.getOrDefault(trigram, 0) + 1);
        }
        if (frequencies.isEmpty()) {
            for (int i = 0; i < normalized.length(); i++) {
                String ch = String.valueOf(normalized.charAt(i));
                frequencies.put(ch, frequencies.getOrDefault(ch, 0) + 1);
            }
        }
        return frequencies;
    }
}
