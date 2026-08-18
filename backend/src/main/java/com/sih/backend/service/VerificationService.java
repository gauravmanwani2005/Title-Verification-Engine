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
import java.util.OptionalDouble;
import java.util.stream.Collectors;

/**
 * Core verification pipeline (per spec).
 *
 *  1.  Normalize / transliterate
 *  2.  Hard rule engine — short-circuits on violation
 *  3.  Candidate retrieval  Fuzzy N=50, Phonetic N=50, Vector N=50
 *  4.  UNION + deduplicate  (max 150 before dedup)
 *  5.  Fuzzy + phonetic scores for EVERY candidate
 *  6.  Member 1 (LaBSE) embeddingScore for EVERY candidate
 *  7.  Sort by embeddingScore DESC → take top K=20
 *  8.  Member 2 (Gemini) semanticScore for those K=20  (matched back by candidateId)
 *  9.  finalScore = max(embeddingScore, semanticScore)   [non-weighted]
 *  10. 3-way decision: <30 APPROVED, 30-70 REVIEW, >=70 REJECTED
 *  11. Persist all score fields + model versions
 */
@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    @Autowired private RuleEngine ruleEngine;
    @Autowired private PhoneticService phoneticService;
    @Autowired private TitleRepository titleRepository;
    @Autowired private SubmissionRepository submissionRepository;
    @Autowired private SimilarityScorer similarityScorer;
    @Autowired private AiClient aiClient;
    @Autowired private ObjectMapper objectMapper;

    // ── Retrieval limits ──────────────────────────────────────────────────────
    @Value("${candidate.fuzzy.retrieval.limit:50}")
    private int fuzzyRetrievalLimit;

    @Value("${candidate.phonetic.retrieval.limit:50}")
    private int phoneticRetrievalLimit;

    @Value("${candidate.vector.retrieval.limit:50}")
    private int vectorRetrievalLimit;

    // ── Top-K after embedding ranking ─────────────────────────────────────────
    @Value("${ai.candidate.top-k:20}")
    private int topK;

    // ── Response filter thresholds ────────────────────────────────────────────
    @Value("${candidate.fuzzy.threshold:50.0}")     private double fuzzyThreshold;
    @Value("${candidate.phonetic.threshold:75.0}")  private double phoneticThreshold;
    @Value("${candidate.embedding.threshold:70.0}") private double embeddingThreshold;
    @Value("${candidate.semantic.threshold:70.0}")  private double semanticThreshold;

    // ── 3-way decision boundaries (finalScore 0–100) ─────────────────────────
    private static final double VERIFIED_MAX = 30.0;
    private static final double REVIEW_MAX   = 70.0;

    // ── Model version constants (Item 14 — auditability) ─────────────────────
    private static final String MEMBER1_MODEL = "sentence-transformers/LaBSE";
    private static final String MEMBER2_MODEL = "gemini-2.0-flash-lite";

    // ─────────────────────────────────────────────────────────────────────────

    public VerificationResponse verify(VerificationRequest request) {
        String rawTitle    = request.getTitle();
        String language    = request.getLanguage();
        String applicantId = request.getApplicantId();

        // 1. Normalize
        String normalized = TransliterationHelper.normalize(rawTitle);
        log.info("Verifying: '{}' → '{}'", rawTitle, normalized);

        // 2. Hard rules
        List<String> ruleViolations = ruleEngine.check(normalized);
        String submissionId = UUID.randomUUID().toString();
        List<String> reasons = new ArrayList<>();

        if (!ruleViolations.isEmpty()) {
            // ruleViolations carries the detail — reasons gets a single human-readable summary
            reasons.add("Title rejected due to " + ruleViolations.size()
                    + " rule violation" + (ruleViolations.size() > 1 ? "s" : "") + ". See ruleViolations for details.");
            return saveAndReturnResponse(submissionId, rawTitle, language, applicantId,
                    "REJECTED", 0.0, 0.0, reasons, Collections.emptyList(), ruleViolations, false);
        }

        // 3. Candidate Retrieval — N=50 per mechanism
        String phoneticKey = phoneticService.computePhoneticKey(normalized);

        List<Title> fuzzyCandidates    = titleRepository.findFuzzyMatches(normalized, fuzzyRetrievalLimit);
        List<Title> phoneticCandidates = titleRepository.findByPhoneticKey(phoneticKey)
                .stream().limit(phoneticRetrievalLimit).toList();
        List<Title> vectorCandidates   = fetchVectorCandidates(normalized, language);

        Set<Long> fuzzyIds    = fuzzyCandidates.stream().map(Title::getId).collect(Collectors.toSet());
        Set<Long> phoneticIds = phoneticCandidates.stream().map(Title::getId).collect(Collectors.toSet());
        Set<Long> vectorIds   = vectorCandidates.stream().map(Title::getId).collect(Collectors.toSet());

        log.info("Retrieval: fuzzy={}, phonetic={}, vector={}",
                fuzzyCandidates.size(), phoneticCandidates.size(), vectorCandidates.size());

        // 4. UNION + deduplicate (max 150 before dedup)
        Map<Long, Title> candidatePool = new LinkedHashMap<>();
        for (Title t : fuzzyCandidates)    candidatePool.put(t.getId(), t);
        for (Title t : phoneticCandidates) candidatePool.putIfAbsent(t.getId(), t);
        for (Title t : vectorCandidates)   candidatePool.putIfAbsent(t.getId(), t);

        log.info("Candidate pool after dedup: {}", candidatePool.size());

        // 5. Fuzzy + phonetic scores for EVERY candidate
        List<MatchedTitleDto> allCandidates = new ArrayList<>();
        for (Title candidate : candidatePool.values()) {
            double fuzzySim = similarityScorer.calculateSimilarity(normalized, candidate.getNormalizedText());

            String cPhoneticKey = candidate.getPhoneticKey();
            if (cPhoneticKey == null || cPhoneticKey.isBlank()) {
                cPhoneticKey = phoneticService.computePhoneticKey(candidate.getNormalizedText());
            }
            double phoneticSim = phoneticIds.contains(candidate.getId())
                    ? 100.0
                    : similarityScorer.calculateSimilarity(phoneticKey, cPhoneticKey);

            List<String> matchTypes = new ArrayList<>();
            if (fuzzyIds.contains(candidate.getId()))    matchTypes.add("FUZZY");
            if (phoneticIds.contains(candidate.getId())) matchTypes.add("PHONETIC");
            if (vectorIds.contains(candidate.getId()))   matchTypes.add("VECTOR");

            allCandidates.add(new MatchedTitleDto(
                    candidate.getId(), candidate.getRawText(),
                    fuzzySim, phoneticSim, matchTypes));
        }

        // 6. Member 1 (LaBSE) — embeddingScore for ENTIRE pool
        boolean aiCallInvoked = false;
        for (MatchedTitleDto dto : allCandidates) {
            try {
                double labseScore = aiClient.getSemanticSimilarity(
                        normalized,
                        TransliterationHelper.normalize(dto.getTitle()),
                        language,
                        dto.getFuzzyScore(),
                        dto.getPhoneticScore()) * 100.0;
                dto.setEmbeddingScore(labseScore);
                aiCallInvoked = true;
                if (labseScore >= embeddingThreshold) dto.getMatchTypes().add("EMBEDDED");
            } catch (Exception e) {
                log.debug("LaBSE skipped for '{}': {}", dto.getTitle(), e.getMessage());
            }
        }

        // 7. Sort by embeddingScore DESC → take top K=20
        List<MatchedTitleDto> topKCandidates = allCandidates.stream()
                .sorted(Comparator.comparingDouble(
                        (MatchedTitleDto dto) -> dto.getEmbeddingScore() != null ? dto.getEmbeddingScore() : 0.0
                ).reversed())
                .limit(topK)
                .collect(Collectors.toList());

        log.info("Top-K={} selected by embeddingScore for Gemini", topKCandidates.size());

        // 8. Member 2 (Gemini) — semanticScore for K=20, matched back by candidateId
        try {
            List<Map<String, Object>> geminiInput = topKCandidates.stream()
                    .map(dto -> {
                        Map<String, Object> c = new HashMap<>();
                        c.put("registration_id", String.valueOf(dto.getCandidateId()));
                        c.put("candidate_id",    String.valueOf(dto.getCandidateId()));
                        c.put("title",    dto.getTitle());
                        c.put("language", language);
                        c.put("embedding_similarity",
                                dto.getEmbeddingScore() != null ? dto.getEmbeddingScore() / 100.0 : 0.0);
                        return c;
                    })
                    .toList();

            List<Map<String, Object>> geminiResults =
                    aiClient.getGeminiSemanticScores(normalized, language, geminiInput);
            aiCallInvoked = true;

            // Build lookup by candidateId string
            Map<String, MatchedTitleDto> candidateById = new HashMap<>();
            for (MatchedTitleDto dto : topKCandidates) {
                candidateById.put(String.valueOf(dto.getCandidateId()), dto);
            }

            for (Map<String, Object> result : geminiResults) {
                // Accept both candidate_id and registration_id from Gemini response
                String rid = result.containsKey("candidate_id")
                        ? (String) result.get("candidate_id")
                        : (String) result.get("registration_id");
                Number score  = (Number) result.get("semantic_score");
                String reason = (String) result.get("reason");
                MatchedTitleDto dto = candidateById.get(rid);
                if (dto != null && score != null) {
                    double semScore = score.doubleValue() * 100.0;
                    dto.setSemanticScore(semScore);
                    dto.setSemanticReason(reason);
                    if (semScore >= semanticThreshold) dto.getMatchTypes().add("GEMINI");
                }
            }
        } catch (Exception e) {
            log.debug("Gemini scoring skipped (not blocking): {}", e.getMessage());
        }

        // 9. finalScore = weighted formula per architecture spec:
        //    Final = (0.25 × avg(fuzzy, phonetic)) + (0.35 × embedding) + (0.40 × gemini)
        //
        //    All scores are 0–100. If Gemini didn't run (AI unavailable), its weight
        //    is redistributed proportionally to embedding so scores stay on the same scale:
        //    fallback = (0.25 × avg(fuzzy, phonetic)) + (0.75 × embedding)
        for (MatchedTitleDto dto : topKCandidates) {
            double fuzzy    = dto.getFuzzyScore()     != null ? dto.getFuzzyScore()     : 0.0;
            double phonetic = dto.getPhoneticScore()  != null ? dto.getPhoneticScore()  : 0.0;
            double emb      = dto.getEmbeddingScore() != null ? dto.getEmbeddingScore() : 0.0;
            double sem      = dto.getSemanticScore()  != null ? dto.getSemanticScore()  : -1.0;

            double lexicalComponent = (fuzzy + phonetic) / 2.0;  // avg of fuzzy + phonetic

            double finalScore;
            if (sem >= 0.0) {
                // Full formula — all three signals available
                finalScore = (0.25 * lexicalComponent) + (0.35 * emb) + (0.40 * sem);
            } else {
                // Gemini unavailable — redistribute its 40% weight to embedding
                // Effective: 0.25 × lexical + 0.75 × embedding
                finalScore = (0.25 * lexicalComponent) + (0.75 * emb);
            }

            dto.setFinalScore(Math.min(100.0, Math.max(0.0, finalScore)));
        }

        // Sort by finalScore DESC
        topKCandidates.sort(Comparator.comparingDouble(
                (MatchedTitleDto dto) -> dto.getFinalScore() != null ? dto.getFinalScore() : 0.0
        ).reversed());

        // Filter qualifying candidates for the response
        List<MatchedTitleDto> qualifyingCandidates = topKCandidates.stream()
                .filter(dto ->
                        (dto.getFuzzyScore()     != null && dto.getFuzzyScore()     >= fuzzyThreshold)
                     || (dto.getPhoneticScore()  != null && dto.getPhoneticScore()  >= phoneticThreshold)
                     || (dto.getEmbeddingScore() != null && dto.getEmbeddingScore() >= embeddingThreshold)
                     || (dto.getSemanticScore()  != null && dto.getSemanticScore()  >= semanticThreshold))
                .collect(Collectors.toList());

        // 10. 3-way decision using finalScore
        double topFinalScore = qualifyingCandidates.isEmpty() ? 0.0
                : (qualifyingCandidates.get(0).getFinalScore() != null
                        ? qualifyingCandidates.get(0).getFinalScore() : 0.0);

        double verificationProbability = Math.max(0.0, Math.min(100.0, 100.0 - topFinalScore));

        String verdict;
        if (topFinalScore < VERIFIED_MAX) {
            verdict = "APPROVED";
            reasons.add("No significant similarity conflicts found with existing titles.");
        } else if (topFinalScore < REVIEW_MAX) {
            verdict = "REVIEW";
            if (!qualifyingCandidates.isEmpty()) {
                reasons.add(String.format("Borderline similarity (%.1f%%) with '%s' — referred for officer review.",
                        topFinalScore, qualifyingCandidates.get(0).getTitle()));
            }
        } else {
            verdict = "REJECTED";
            if (!qualifyingCandidates.isEmpty()) {
                reasons.add(String.format("Similar to existing title '%s' (%.1f%% final score)",
                        qualifyingCandidates.get(0).getTitle(), topFinalScore));
            }
        }

        log.info("Verdict={} | topFinalScore={} | qualifying={}", verdict, topFinalScore, qualifyingCandidates.size());

        // Save APPROVED title into the title table so future submissions detect it as a conflict
        if ("APPROVED".equals(verdict)) {
            try {
                if (!titleRepository.existsByNormalizedText(normalized)) {
                    Title newTitle = new Title(rawTitle, normalized,
                            phoneticService.computePhoneticKey(normalized), "APPROVED");
                    titleRepository.save(newTitle);
                    log.info("Saved approved title '{}' to title table for future conflict detection", rawTitle);
                }
            } catch (Exception e) {
                log.warn("Could not save approved title to DB (non-blocking): {}", e.getMessage());
            }
        }

        return saveAndReturnResponse(submissionId, rawTitle, language, applicantId,
                verdict, verificationProbability, topFinalScore,
                reasons, qualifyingCandidates, ruleViolations, aiCallInvoked);
    }

    // ─── Vector candidate fetch ───────────────────────────────────────────────

    private List<Title> fetchVectorCandidates(String normalized, String language) {
        try {
            List<String> vectorTitles = aiClient.getVectorCandidates(normalized, language, vectorRetrievalLimit);
            if (vectorTitles == null || vectorTitles.isEmpty()) return Collections.emptyList();
            return titleRepository.findAll().stream()
                    .filter(t -> vectorTitles.contains(t.getRawText())
                              || vectorTitles.contains(t.getNormalizedText()))
                    .toList();
        } catch (Exception e) {
            log.warn("Vector retrieval failed — cosine fallback: {}", e.getMessage());
            return cosineVectorFallback(normalized);
        }
    }

    private List<Title> cosineVectorFallback(String normalized) {
        org.apache.commons.text.similarity.CosineSimilarity cosine =
                new org.apache.commons.text.similarity.CosineSimilarity();
        Map<CharSequence, Integer> qf = getTermFrequencies(normalized);
        return titleRepository.findAll().stream()
                .map(t -> {
                    double s = 0.0;
                    try { s = cosine.cosineSimilarity(qf, getTermFrequencies(t.getNormalizedText())); }
                    catch (Exception ignored) {}
                    return new AbstractMap.SimpleEntry<>(t, s);
                })
                .filter(e -> e.getValue() >= 0.5)
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(vectorRetrievalLimit)
                .map(Map.Entry::getKey)
                .toList();
    }

    // ─── Persistence ──────────────────────────────────────────────────────────

    public VerificationResponse getSubmission(String submissionId) {
        Submission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NoSuchElementException("Submission not found: " + submissionId));
        return mapToResponse(sub);
    }

    /**
     * Officer final decision on a REVIEW-verdict submission.
     * decision must be "ACCEPTED" or "REJECTED".
     * If ACCEPTED, the title is saved to the title table for future conflict detection.
     */
    public Map<String, Object> applyOfficerDecision(String submissionId,
            com.sih.backend.dto.OfficerDecisionRequest request) {

        Submission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NoSuchElementException("Submission not found: " + submissionId));

        String decision = request.getDecision() == null ? "" : request.getDecision().toUpperCase().trim();
        if (!"ACCEPTED".equals(decision) && !"REJECTED".equals(decision)) {
            throw new IllegalArgumentException("decision must be ACCEPTED or REJECTED");
        }

        sub.setOfficerDecision(decision);
        sub.setOfficerId(request.getOfficerId());
        sub.setOfficerNote(request.getNote());
        sub.setDecidedAt(java.time.LocalDateTime.now());

        // Mirror final verdict to the verdict field for downstream consumers
        sub.setVerdict("ACCEPTED".equals(decision) ? "APPROVED" : "REJECTED");
        submissionRepository.save(sub);

        // If officer accepted, register title for future conflict detection
        if ("ACCEPTED".equals(decision)) {
            try {
                String normalized = com.sih.backend.util.TransliterationHelper.normalize(sub.getTitle());
                if (!titleRepository.existsByNormalizedText(normalized)) {
                    Title newTitle = new Title(sub.getTitle(), normalized,
                            phoneticService.computePhoneticKey(normalized), "APPROVED");
                    titleRepository.save(newTitle);
                    log.info("Officer ACCEPTED '{}' — saved to title table", sub.getTitle());
                }
            } catch (Exception e) {
                log.warn("Could not save officer-accepted title to DB (non-blocking): {}", e.getMessage());
            }
        }

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("submissionId",    submissionId);
        response.put("officerDecision", decision);
        response.put("officerId",       request.getOfficerId());
        response.put("verdict",         sub.getVerdict());
        response.put("decidedAt",       sub.getDecidedAt().toString());
        return response;
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
        submission.setSimilarityScore(similarityScore);   // = finalScore
        submission.setAiCallInvoked(aiCallInvoked);

        // Item 13 — persist separate score audit fields
        submission.setFinalScore(similarityScore);
        submission.setMember1Model(MEMBER1_MODEL);
        submission.setMember2Model(MEMBER2_MODEL);

        if (!matchedTitles.isEmpty()) {
            OptionalDouble topEmb = matchedTitles.stream()
                    .filter(dto -> dto.getEmbeddingScore() != null)
                    .mapToDouble(MatchedTitleDto::getEmbeddingScore).max();
            OptionalDouble topSem = matchedTitles.stream()
                    .filter(dto -> dto.getSemanticScore() != null)
                    .mapToDouble(MatchedTitleDto::getSemanticScore).max();
            submission.setTopEmbeddingScore(topEmb.isPresent() ? topEmb.getAsDouble() : null);
            submission.setTopSemanticScore(topSem.isPresent()  ? topSem.getAsDouble()  : null);
        }

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

        return new VerificationResponse(id, verdict, verificationProbability, similarityScore,
                reasons, matchedTitles, ruleViolations, aiCallInvoked);
    }

    private VerificationResponse mapToResponse(Submission sub) {
        List<String> reasons; List<MatchedTitleDto> matchedTitles; List<String> ruleViolations;
        try {
            reasons        = objectMapper.readValue(sub.getReasons(),        new TypeReference<>() {});
            matchedTitles  = objectMapper.readValue(sub.getMatchedTitles(),  new TypeReference<>() {});
            ruleViolations = objectMapper.readValue(sub.getRuleViolations(), new TypeReference<>() {});
        } catch (Exception e) {
            reasons        = Collections.emptyList();
            matchedTitles  = Collections.emptyList();
            ruleViolations = Collections.emptyList();
        }
        return new VerificationResponse(sub.getId(), sub.getVerdict(),
                sub.getVerificationProbability(), sub.getSimilarityScore(),
                reasons, matchedTitles, ruleViolations, sub.isAiCallInvoked());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Map<CharSequence, Integer> getTermFrequencies(String text) {
        Map<CharSequence, Integer> freq = new HashMap<>();
        if (text == null || text.isBlank()) return freq;
        String n = text.trim().toLowerCase().replaceAll("\\s+", "");
        for (int i = 0; i <= n.length() - 3; i++) {
            String t = n.substring(i, i + 3);
            freq.put(t, freq.getOrDefault(t, 0) + 1);
        }
        if (freq.isEmpty()) {
            for (int i = 0; i < n.length(); i++) {
                String ch = String.valueOf(n.charAt(i));
                freq.put(ch, freq.getOrDefault(ch, 0) + 1);
            }
        }
        return freq;
    }
}
