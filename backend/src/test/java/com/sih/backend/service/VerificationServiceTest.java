package com.sih.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.backend.client.VectorSearchClient;
import com.sih.backend.dto.MatchedTitleDto;
import com.sih.backend.dto.VectorCandidate;
import com.sih.backend.dto.VerificationRequest;
import com.sih.backend.dto.VerificationResponse;
import com.sih.backend.model.Title;
import com.sih.backend.repository.SubmissionRepository;
import com.sih.backend.repository.TitleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
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
    private VectorSearchClient vectorSearchClient;

    @InjectMocks
    private VerificationService verificationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(verificationService, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(verificationService, "fuzzyRetrievalLimit", 100);
        ReflectionTestUtils.setField(verificationService, "phoneticRetrievalLimit", 100);
        ReflectionTestUtils.setField(verificationService, "embeddingRetrievalLimit", 100);
    }

    @Test
    void returnsFuzzyOnlyCandidateWithZeroDefaults() {
        VerificationRequest request = new VerificationRequest("Bharat Samachar", "en", "APP-1");
        Title fuzzy = title(1L, "Bharat Samachar", "bharat samachar");

        when(ruleEngine.check(anyString())).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey(anyString())).thenReturn("BRTSMXR");
        when(titleRepository.findFuzzyMatches(anyString(), anyInt())).thenReturn(List.of(fuzzy));
        when(titleRepository.findByPhoneticKey(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(similarityScorer.calculateSimilarity(anyString(), anyString())).thenReturn(82.4);
        when(vectorSearchClient.findNearestCandidates(anyString(), anyString(), anyInt())).thenReturn(Collections.emptyList());

        VerificationResponse response = verificationService.verify(request);

        assertEquals("", response.getVerdict());
        assertEquals(1, response.getMatchedTitles().size());
        MatchedTitleDto candidate = response.getMatchedTitles().get(0);
        assertEquals(82.4, candidate.getFuzzyScore());
        assertEquals(0.0, candidate.getPhoneticScore());
        assertEquals(0.0, candidate.getEmbeddedScore());
        assertEquals(List.of("FUZZY"), candidate.getMatchTypes());
    }

    @Test
    void returnsEmbeddingOnlyCandidate() {
        VerificationRequest request = new VerificationRequest("Pratidin Sandhya", "en", "APP-2");

        when(ruleEngine.check(anyString())).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey(anyString())).thenReturn("PRTDN");
        when(titleRepository.findFuzzyMatches(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(titleRepository.findByPhoneticKey(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(vectorSearchClient.findNearestCandidates(anyString(), anyString(), anyInt()))
                .thenReturn(List.of(new VectorCandidate(31L, "Pratidin Sandhya", 1, 84.7)));

        VerificationResponse response = verificationService.verify(request);

        MatchedTitleDto candidate = response.getMatchedTitles().get(0);
        assertEquals(0.0, candidate.getFuzzyScore());
        assertEquals(0.0, candidate.getPhoneticScore());
        assertEquals(84.7, candidate.getEmbeddedScore());
        assertEquals(List.of("EMBEDDED"), candidate.getMatchTypes());
    }

    @Test
    void mergesCandidateReturnedByAllThreeSources() {
        VerificationRequest request = new VerificationRequest("Bharat Samachar", "en", "APP-3");
        Title shared = title(25L, "Bharat Samachar", "bharat samachar");

        when(ruleEngine.check(anyString())).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey(anyString())).thenReturn("BRTSMXR");
        when(titleRepository.findFuzzyMatches(anyString(), anyInt())).thenReturn(List.of(shared));
        when(titleRepository.findByPhoneticKey(anyString(), any())).thenReturn(new PageImpl<>(List.of(shared)));
        when(similarityScorer.calculateSimilarity(eq("bharat samachar"), eq("bharat samachar"))).thenReturn(82.4);
        when(vectorSearchClient.findNearestCandidates(anyString(), anyString(), anyInt()))
                .thenReturn(List.of(new VectorCandidate(25L, "Bharat Samachar", 1, 76.8)));

        VerificationResponse response = verificationService.verify(request);

        assertEquals(1, response.getMatchedTitles().size());
        MatchedTitleDto candidate = response.getMatchedTitles().get(0);
        assertEquals(25L, candidate.getTitleId());
        assertEquals(82.4, candidate.getFuzzyScore());
        assertEquals(100.0, candidate.getPhoneticScore());
        assertEquals(76.8, candidate.getEmbeddedScore());
        assertEquals(List.of("FUZZY", "PHONETIC", "EMBEDDED"), candidate.getMatchTypes());
    }

    @Test
    void returnsMoreThanTwoCandidatesWithoutTruncation() {
        VerificationRequest request = new VerificationRequest("Bharat", "en", "APP-4");
        List<Title> fuzzyMatches = List.of(
                title(1L, "Bharat One", "bharat one"),
                title(2L, "Bharat Two", "bharat two"),
                title(3L, "Bharat Three", "bharat three")
        );

        when(ruleEngine.check(anyString())).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey(anyString())).thenReturn("BRT");
        when(titleRepository.findFuzzyMatches(anyString(), anyInt())).thenReturn(fuzzyMatches);
        when(titleRepository.findByPhoneticKey(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(similarityScorer.calculateSimilarity(anyString(), anyString())).thenReturn(70.0, 69.0, 68.0);
        when(vectorSearchClient.findNearestCandidates(anyString(), anyString(), anyInt())).thenReturn(Collections.emptyList());

        VerificationResponse response = verificationService.verify(request);

        assertEquals(3, response.getMatchedTitles().size());
    }

    @Test
    void continuesWhenEmbeddingServiceFails() {
        VerificationRequest request = new VerificationRequest("Bharat Samachar", "en", "APP-5");
        Title fuzzy = title(1L, "Bharat Samachar", "bharat samachar");

        when(ruleEngine.check(anyString())).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey(anyString())).thenReturn("BRTSMXR");
        when(titleRepository.findFuzzyMatches(anyString(), anyInt())).thenReturn(List.of(fuzzy));
        when(titleRepository.findByPhoneticKey(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(similarityScorer.calculateSimilarity(anyString(), anyString())).thenReturn(82.4);
        when(vectorSearchClient.findNearestCandidates(anyString(), anyString(), anyInt()))
                .thenThrow(new RuntimeException("ANN unavailable"));

        VerificationResponse response = verificationService.verify(request);

        assertEquals(1, response.getMatchedTitles().size());
        assertEquals(0.0, response.getMatchedTitles().get(0).getEmbeddedScore());
    }

    @Test
    void skipsEmbeddingCallWhenHardRulesFail() {
        VerificationRequest request = new VerificationRequest("National Express", "en", "APP-6");
        when(ruleEngine.check(anyString())).thenReturn(List.of("Contains disallowed prefix"));

        VerificationResponse response = verificationService.verify(request);

        assertEquals("REJECTED", response.getVerdict());
        verifyNoInteractions(vectorSearchClient);
        verify(titleRepository, never()).findFuzzyMatches(anyString(), anyInt());
    }

    @Test
    void returnsEmptyCandidatePoolWhenNothingMatches() {
        VerificationRequest request = new VerificationRequest("Unique Fresh Title", "en", "APP-7");

        when(ruleEngine.check(anyString())).thenReturn(Collections.emptyList());
        when(phoneticService.computePhoneticKey(anyString())).thenReturn("UNQFRX");
        when(titleRepository.findFuzzyMatches(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(titleRepository.findByPhoneticKey(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(vectorSearchClient.findNearestCandidates(anyString(), anyString(), anyInt())).thenReturn(Collections.emptyList());

        VerificationResponse response = verificationService.verify(request);

        assertNotNull(response.getMatchedTitles());
        assertTrue(response.getMatchedTitles().isEmpty());
        assertEquals(0.0, response.getSimilarityScore());
        assertEquals(0.0, response.getVerificationProbability());
    }

    private Title title(Long id, String rawText, String normalizedText) {
        Title title = new Title();
        title.setId(id);
        title.setRawText(rawText);
        title.setNormalizedText(normalizedText);
        title.setStatus("APPROVED");
        return title;
    }
}
