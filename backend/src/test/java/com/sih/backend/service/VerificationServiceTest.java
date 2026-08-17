package com.sih.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.backend.client.AiClient;
import com.sih.backend.dto.MatchedTitleDto;
import com.sih.backend.dto.VerificationRequest;
import com.sih.backend.dto.VerificationResponse;
import com.sih.backend.model.Submission;
import com.sih.backend.model.Title;
import com.sih.backend.repository.SubmissionRepository;
import com.sih.backend.repository.TitleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VerificationServiceTest {

    @Mock
    private RuleEngine ruleEngine;

    @Mock
    private PhoneticService phoneticService;

    @Mock
    private TitleRepository titleRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private SimilarityScorer similarityScorer;

    @Mock
    private AiClient aiClient;

    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private VerificationService verificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(verificationService, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(verificationService, "fuzzyLimit", 20);
        ReflectionTestUtils.setField(verificationService, "phoneticLimit", 20);
        ReflectionTestUtils.setField(verificationService, "embeddingLimit", 5);
        ReflectionTestUtils.setField(verificationService, "similarityThreshold", 40.0);
        ReflectionTestUtils.setField(verificationService, "phoneticThreshold", 75.0);
    }

    private VerificationRequest createRequest(String title) {
        VerificationRequest req = new VerificationRequest();
        req.setTitle(title);
        req.setLanguage("en");
        req.setApplicantId("APP-TEST");
        return req;
    }

    // TEST 1: Exact title match
    @Test
    void testExactTitleMatch() {
        VerificationRequest req = createRequest("Namaskar Samachar");
        when(ruleEngine.check("namaskar samachar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskar samachar")).thenReturn("NMSKSMCR");
        
        Title existing = new Title("Namaskar Samachar", "namaskar samachar", "NMSKSMCR", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskar samachar")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("NMSKSMCR")).thenReturn(List.of(existing));
        
        when(similarityScorer.calculateSimilarity("namaskar samachar", "namaskar samachar")).thenReturn(100.0);
        when(similarityScorer.calculateSimilarity("NMSKSMCR", "NMSKSMCR")).thenReturn(100.0);

        VerificationResponse res = verificationService.verify(req);
        
        assertEquals("REJECTED", res.getVerdict());
        assertEquals(100.0, res.getSimilarityScore());
        assertEquals(0.0, res.getVerificationProbability());
        assertEquals(1, res.getMatchedTitles().size());
        
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals("Namaskar Samachar", candidate.getTitle());
        assertEquals(100.0, candidate.getFuzzyScore());
        assertEquals(100.0, candidate.getPhoneticScore());
    }

    // TEST 2: Small spelling variation
    @Test
    void testSmallSpellingVariation() {
        VerificationRequest req = createRequest("Namaskaar Samachar");
        when(ruleEngine.check("namaskaar samachar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskaar samachar")).thenReturn("NMSKSMCR");

        Title existing = new Title("Namaskar Samachar", "namaskar samachar", "NMSKSMCR", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskaar samachar")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("NMSKSMCR")).thenReturn(List.of(existing));

        // Fuzzy score is 95.0, phonetic keys match (100.0)
        when(similarityScorer.calculateSimilarity("namaskaar samachar", "namaskar samachar")).thenReturn(95.0);
        when(similarityScorer.calculateSimilarity("NMSKSMCR", "NMSKSMCR")).thenReturn(100.0);

        VerificationResponse res = verificationService.verify(req);

        assertEquals("REJECTED", res.getVerdict());
        assertTrue(res.getSimilarityScore() >= 95.0);
        assertEquals(1, res.getMatchedTitles().size());
        
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals(95.0, candidate.getFuzzyScore());
        assertEquals(100.0, candidate.getPhoneticScore());
    }

    // TEST 3: Strong phonetic similarity
    @Test
    void testStrongPhoneticSimilarity() {
        VerificationRequest req = createRequest("Namskar Samachar");
        when(ruleEngine.check("namskar samachar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namskar samachar")).thenReturn("NMSKSMCR");

        Title existing = new Title("Namaskar Samachar", "namaskar samachar", "NMSKSMCR", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("namskar samachar")).thenReturn(Collections.emptyList());
        when(titleRepository.findByPhoneticKey("NMSKSMCR")).thenReturn(List.of(existing));

        when(similarityScorer.calculateSimilarity("namskar samachar", "namaskar samachar")).thenReturn(35.0); // fuzzy below threshold
        when(similarityScorer.calculateSimilarity("NMSKSMCR", "NMSKSMCR")).thenReturn(100.0); // exact phonetic match

        VerificationResponse res = verificationService.verify(req);

        assertEquals("REJECTED", res.getVerdict());
        assertEquals(100.0, res.getSimilarityScore());
        assertEquals(1, res.getMatchedTitles().size());
        
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertNull(candidate.getFuzzyScore()); // fuzzy below threshold and not in fuzzyMatches list
        assertEquals(100.0, candidate.getPhoneticScore());
    }

    // TEST 4: Strong semantic/embedding similarity
    @Test
    void testStrongSemanticSimilarity() {
        VerificationRequest req = createRequest("Morning Bulletin");
        when(ruleEngine.check("morning bulletin")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("morning bulletin")).thenReturn("MRNKBLTN");

        Title existing = new Title("Daily News", "daily news", "TLNS", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("morning bulletin")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("MRNKBLTN")).thenReturn(Collections.emptyList());

        when(similarityScorer.calculateSimilarity("morning bulletin", "daily news")).thenReturn(45.0);
        when(similarityScorer.calculateSimilarity("MRNKBLTN", "TLNS")).thenReturn(10.0); // phonetic below threshold
        
        // Mock AI client returns 0.90 (90%)
        when(aiClient.getSemanticSimilarity("morning bulletin", "daily news", "en")).thenReturn(0.90);

        VerificationResponse res = verificationService.verify(req);

        assertEquals("REJECTED", res.getVerdict());
        assertEquals(90.0, res.getSimilarityScore());
        assertEquals(1, res.getMatchedTitles().size());

        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals(45.0, candidate.getFuzzyScore());
        assertNull(candidate.getPhoneticScore());
        assertEquals(90.0, candidate.getEmbeddedScore());
        assertTrue(candidate.getMatchTypes().contains("EMBEDDED"));
    }

    // TEST 5: Candidate found by fuzzy only
    @Test
    void testCandidateFoundByFuzzyOnly() {
        VerificationRequest req = createRequest("Random Title");
        when(ruleEngine.check("random title")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("random title")).thenReturn("RNTMTTL");

        Title existing = new Title("Randum Tytle", "randum tytle", "RNTMTTLD", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("random title")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("RNTMTTL")).thenReturn(Collections.emptyList());

        when(similarityScorer.calculateSimilarity("random title", "randum tytle")).thenReturn(85.0);
        when(similarityScorer.calculateSimilarity("RNTMTTL", "RNTMTTLD")).thenReturn(60.0); // below phonetic threshold (75)

        // Mock AI client to fail, keeping embeddedScore null
        when(aiClient.getSemanticSimilarity("random title", "randum tytle", "en")).thenThrow(new RuntimeException("AI service unavailable"));

        VerificationResponse res = verificationService.verify(req);

        assertEquals(1, res.getMatchedTitles().size());
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals(85.0, candidate.getFuzzyScore());
        assertNull(candidate.getPhoneticScore());
        assertNull(candidate.getEmbeddedScore());
    }

    // TEST 6: Candidate found by phonetic only
    @Test
    void testCandidateFoundByPhoneticOnly() {
        VerificationRequest req = createRequest("Phonetic Match");
        when(ruleEngine.check("phonetic match")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("phonetic match")).thenReturn("FNTKMTS");

        Title existing = new Title("Fonetic Match", "fonetic match", "FNTKMTS", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("phonetic match")).thenReturn(Collections.emptyList());
        when(titleRepository.findByPhoneticKey("FNTKMTS")).thenReturn(List.of(existing));

        when(similarityScorer.calculateSimilarity("phonetic match", "fonetic match")).thenReturn(30.0); // below fuzzy threshold (40)
        when(similarityScorer.calculateSimilarity("FNTKMTS", "FNTKMTS")).thenReturn(100.0);

        VerificationResponse res = verificationService.verify(req);

        assertEquals(1, res.getMatchedTitles().size());
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertNull(candidate.getFuzzyScore());
        assertEquals(100.0, candidate.getPhoneticScore());
    }

    // TEST 7: Candidate found by embedding only
    @Test
    void testCandidateFoundByEmbeddingOnly() {
        VerificationRequest req = createRequest("semantic input");
        when(ruleEngine.check("semantic input")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("semantic input")).thenReturn("SMNTKNPT");

        Title existing = new Title("semantic target", "semantic target", "SMNTKTRKT", "APPROVED");
        existing.setId(1L);

        // Discovered via fuzzy (above threshold) to join the candidate pool
        when(titleRepository.findFuzzyMatches("semantic input")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("SMNTKNPT")).thenReturn(Collections.emptyList());

        when(similarityScorer.calculateSimilarity("semantic input", "semantic target")).thenReturn(45.0);
        when(similarityScorer.calculateSimilarity("SMNTKNPT", "SMNTKTRKT")).thenReturn(50.0); // below phonetic threshold

        when(aiClient.getSemanticSimilarity("semantic input", "semantic target", "en")).thenReturn(0.85);

        VerificationResponse res = verificationService.verify(req);

        assertEquals(1, res.getMatchedTitles().size());
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals(45.0, candidate.getFuzzyScore());
        assertNull(candidate.getPhoneticScore());
        assertEquals(85.0, candidate.getEmbeddedScore());
    }

    // TEST 8: Candidate found by all three mechanisms
    @Test
    void testCandidateFoundByAllThree() {
        VerificationRequest req = createRequest("Namaskar Samachar");
        when(ruleEngine.check("namaskar samachar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskar samachar")).thenReturn("NMSKSMCR");

        Title existing = new Title("Namaskar Samachar", "namaskar samachar", "NMSKSMCR", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskar samachar")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("NMSKSMCR")).thenReturn(List.of(existing));

        when(similarityScorer.calculateSimilarity("namaskar samachar", "namaskar samachar")).thenReturn(100.0);
        when(similarityScorer.calculateSimilarity("NMSKSMCR", "NMSKSMCR")).thenReturn(100.0);
        when(aiClient.getSemanticSimilarity("namaskar samachar", "namaskar samachar", "en")).thenReturn(1.0);

        VerificationResponse res = verificationService.verify(req);

        assertEquals(1, res.getMatchedTitles().size());
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals(100.0, candidate.getFuzzyScore());
        assertEquals(100.0, candidate.getPhoneticScore());
        assertEquals(100.0, candidate.getEmbeddedScore());
        assertTrue(candidate.getMatchTypes().contains("FUZZY"));
        assertTrue(candidate.getMatchTypes().contains("PHONETIC"));
        assertTrue(candidate.getMatchTypes().contains("EMBEDDED"));
    }

    // TEST 9: Candidate found by fuzzy + phonetic but not embedding
    @Test
    void testCandidateFoundByFuzzyAndPhoneticNotEmbedding() {
        VerificationRequest req = createRequest("Namaskar Samachar");
        when(ruleEngine.check("namaskar samachar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskar samachar")).thenReturn("NMSKSMCR");

        Title existing = new Title("Namaskar Samachar", "namaskar samachar", "NMSKSMCR", "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskar samachar")).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey("NMSKSMCR")).thenReturn(List.of(existing));

        when(similarityScorer.calculateSimilarity("namaskar samachar", "namaskar samachar")).thenReturn(100.0);
        when(similarityScorer.calculateSimilarity("NMSKSMCR", "NMSKSMCR")).thenReturn(100.0);
        
        // AI fails/returns 0.0 or throws exception -> results in null or fallback
        when(aiClient.getSemanticSimilarity("namaskar samachar", "namaskar samachar", "en")).thenThrow(new RuntimeException("AI Down"));

        VerificationResponse res = verificationService.verify(req);

        assertEquals(1, res.getMatchedTitles().size());
        MatchedTitleDto candidate = res.getMatchedTitles().get(0);
        assertEquals(100.0, candidate.getFuzzyScore());
        assertEquals(100.0, candidate.getPhoneticScore());
        assertNull(candidate.getEmbeddedScore());
    }

    // TEST 10: Multiple candidates returned
    @Test
    void testMultipleCandidatesReturned() {
        VerificationRequest req = createRequest("test");
        when(ruleEngine.check("test")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("test")).thenReturn("TST");

        Title t1 = new Title("test one", "test one", "TSTON", "APPROVED");
        t1.setId(1L);
        Title t2 = new Title("test two", "test two", "TSTTW", "APPROVED");
        t2.setId(2L);

        when(titleRepository.findFuzzyMatches("test")).thenReturn(List.of(t1, t2));
        when(titleRepository.findByPhoneticKey("TST")).thenReturn(Collections.emptyList());

        when(similarityScorer.calculateSimilarity("test", "test one")).thenReturn(80.0);
        when(similarityScorer.calculateSimilarity("TST", "TSTON")).thenReturn(60.0);
        when(similarityScorer.calculateSimilarity("test", "test two")).thenReturn(70.0);
        when(similarityScorer.calculateSimilarity("TST", "TSTTW")).thenReturn(60.0);

        VerificationResponse res = verificationService.verify(req);

        assertEquals(2, res.getMatchedTitles().size());
        assertEquals("test one", res.getMatchedTitles().get(0).getTitle());
        assertEquals("test two", res.getMatchedTitles().get(1).getTitle());
    }

    // TEST 11: Duplicate candidate discovered by multiple mechanisms must appear only once
    @Test
    void testDuplicateCandidateDeduplicated() {
        VerificationRequest req = createRequest("Namaskar");
        when(ruleEngine.check("namaskar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskar")).thenReturn("NMSKR");

        Title t = new Title("Namaskar", "namaskar", "NMSKR", "APPROVED");
        t.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskar")).thenReturn(List.of(t));
        when(titleRepository.findByPhoneticKey("NMSKR")).thenReturn(List.of(t));

        when(similarityScorer.calculateSimilarity("namaskar", "namaskar")).thenReturn(100.0);
        when(similarityScorer.calculateSimilarity("NMSKR", "NMSKR")).thenReturn(100.0);

        VerificationResponse res = verificationService.verify(req);

        assertEquals(1, res.getMatchedTitles().size());
    }

    // TEST 12: Rule violation should prevent AI invocation
    @Test
    void testRuleViolationPreventsAi() {
        VerificationRequest req = createRequest("disallowed word");
        when(ruleEngine.check("disallowed word")).thenReturn(List.of("Contains disallowed word: 'disallowed'"));

        VerificationResponse res = verificationService.verify(req);

        assertEquals("REJECTED", res.getVerdict());
        assertFalse(res.isAiCallInvoked());
        verifyNoInteractions(titleRepository);
        verifyNoInteractions(aiClient);
    }

    // TEST 13: AI failure should trigger Resilience4j fallback
    @Test
    void testAiFailureResilience() {
        VerificationRequest req = createRequest("Namaskar");
        when(ruleEngine.check("namaskar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskar")).thenReturn("NMSKR");

        Title t = new Title("Namaskar", "namaskar", "NMSKR", "APPROVED");
        t.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskar")).thenReturn(List.of(t));
        when(titleRepository.findByPhoneticKey("NMSKR")).thenReturn(List.of(t));

        when(similarityScorer.calculateSimilarity("namaskar", "namaskar")).thenReturn(100.0);
        when(similarityScorer.calculateSimilarity("NMSKR", "NMSKR")).thenReturn(100.0);

        // Mocking client throwing exception simulating CircuitBreaker trigger or connection error
        when(aiClient.getSemanticSimilarity("namaskar", "namaskar", "en")).thenThrow(new RuntimeException("Circuit open"));

        VerificationResponse res = verificationService.verify(req);

        // Should complete without crash and have null or fallback embeddedScore
        assertEquals("REJECTED", res.getVerdict());
        assertNull(res.getMatchedTitles().get(0).getEmbeddedScore());
    }

    // TEST 14: Candidate scores must remain separate
    @Test
    void testCandidateScoresSeparate() {
        VerificationRequest req = createRequest("Namaskar");
        when(ruleEngine.check("namaskar")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("namaskar")).thenReturn("NMSKR");

        Title t = new Title("Namaskar", "namaskar", "NMSKR", "APPROVED");
        t.setId(1L);

        when(titleRepository.findFuzzyMatches("namaskar")).thenReturn(List.of(t));
        when(titleRepository.findByPhoneticKey("NMSKR")).thenReturn(List.of(t));

        when(similarityScorer.calculateSimilarity("namaskar", "namaskar")).thenReturn(90.0);
        when(similarityScorer.calculateSimilarity("NMSKR", "NMSKR")).thenReturn(100.0);
        when(aiClient.getSemanticSimilarity("namaskar", "namaskar", "en")).thenReturn(0.85);

        VerificationResponse res = verificationService.verify(req);

        MatchedTitleDto dto = res.getMatchedTitles().get(0);
        assertEquals(90.0, dto.getFuzzyScore());
        assertEquals(100.0, dto.getPhoneticScore());
        assertEquals(85.0, dto.getEmbeddedScore());
    }

    // TEST 15: Final verdict should still be calculated correctly
    @Test
    void testFinalVerdictCalculation() {
        VerificationRequest req = createRequest("Approved Title");
        when(ruleEngine.check("approved title")).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey("approved title")).thenReturn("APRFTTL");

        // No matches returned from repository -> candidate pool will be empty
        when(titleRepository.findFuzzyMatches("approved title")).thenReturn(Collections.emptyList());
        when(titleRepository.findByPhoneticKey("APRFTTL")).thenReturn(Collections.emptyList());

        VerificationResponse res = verificationService.verify(req);

        assertEquals("APPROVED", res.getVerdict());
        assertEquals(100.0, res.getVerificationProbability());
        assertEquals(0.0, res.getSimilarityScore());
    }

    // TEST 16: Hindi/Devanagari input should still be transliterated and processed
    @Test
    void testHindiDevanagariInput() {
        String rawInput = "नमस्कार समाचार"; // "namaskar samachar"
        String normalizedInput = com.sih.backend.util.TransliterationHelper.normalize(rawInput);

        when(ruleEngine.check(normalizedInput)).thenReturn(Collections.emptyList());
        
        String expectedPhoneticKey = "NMSKSMCR";
        when(phoneticService.computePhoneticKey(normalizedInput)).thenReturn(expectedPhoneticKey);

        Title existing = new Title("Namaskar Samachar", normalizedInput, expectedPhoneticKey, "APPROVED");
        existing.setId(1L);

        when(titleRepository.findFuzzyMatches(normalizedInput)).thenReturn(List.of(existing));
        when(titleRepository.findByPhoneticKey(expectedPhoneticKey)).thenReturn(List.of(existing));

        when(similarityScorer.calculateSimilarity(normalizedInput, normalizedInput)).thenReturn(100.0);
        when(similarityScorer.calculateSimilarity(expectedPhoneticKey, expectedPhoneticKey)).thenReturn(100.0);

        VerificationResponse res = verificationService.verify(createRequest(rawInput));

        assertEquals("REJECTED", res.getVerdict());
        assertEquals(100.0, res.getSimilarityScore());
        assertEquals(1, res.getMatchedTitles().size());
    }
}
