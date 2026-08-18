package com.sih.backend.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
public class AiClient {

    private static final Logger log = LoggerFactory.getLogger(AiClient.class);

    private final RestClient restClient;

    @Value("${ai.service.url:http://localhost:8000/api/semantic/similarity}")
    private String aiServiceUrl;

    @Value("${ai.vector.url:http://localhost:8000/api/vector/search}")
    private String aiVectorUrl;

    @Value("${ai.gemini.url:http://localhost:8000/api/gemini/analyze}")
    private String aiGeminiUrl;

    public AiClient() {
        this.restClient = RestClient.builder().build();
    }

    /**
     * Calls external AI service to obtain semantic similarity between the candidate and the input.
     * Guarded by Resilience4j circuit breaker.
     */
    @CircuitBreaker(name = "aiService", fallbackMethod = "fallbackSemanticSimilarity")
    public double getSemanticSimilarity(String newTitle, String existingTitle, String language, Double fuzzyScore, Double phoneticScore) {
        log.info("Calling external AI service for semantic similarity: '{}' vs '{}' ({}) with fuzzyScore={} and phoneticScore={}", 
                newTitle, existingTitle, language, fuzzyScore, phoneticScore);

        Map<String, Object> body = new HashMap<>();
        body.put("title", newTitle);
        body.put("candidate", existingTitle);
        body.put("language", language);
        body.put("fuzzyScore", fuzzyScore);
        body.put("phoneticScore", phoneticScore);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(aiServiceUrl)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("similarity")) {
                return ((Number) response.get("similarity")).doubleValue();
            }
            throw new RuntimeException("Invalid response from AI Service");
        } catch (Exception e) {
            throw new RuntimeException("Failed to call AI Service: " + e.getMessage(), e);
        }
    }

    /**
     * Fallback method when the AI service call fails or circuit is open.
     */
    public double fallbackSemanticSimilarity(String newTitle, String existingTitle, String language, Double fuzzyScore, Double phoneticScore, Throwable t) {
        log.warn("AI service fallback triggered due to exception: {}", t.getMessage());
        if (newTitle == null || existingTitle == null) {
            return 0.0;
        }
        try {
            org.apache.commons.text.similarity.CosineSimilarity cosine = new org.apache.commons.text.similarity.CosineSimilarity();
            Map<CharSequence, Integer> f1 = getTermFrequencies(newTitle);
            Map<CharSequence, Integer> f2 = getTermFrequencies(existingTitle);
            return cosine.cosineSimilarity(f1, f2);
        } catch (Exception e) {
            return 0.0;
        }
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

    @CircuitBreaker(name = "aiVectorService", fallbackMethod = "fallbackVectorSearch")
    public java.util.List<String> getVectorCandidates(String query, String language, int limit) {
        log.info("Calling external AI service for Vector ANN search: '{}' ({})", query, language);

        // AI service VectorSearchRequest uses field "title" (not "query")
        Map<String, Object> body = new HashMap<>();
        body.put("title", query);
        body.put("language", language);
        body.put("limit", limit);

        try {
            // AI service returns { "model": ..., "candidates": [ {"registration_id":..., "title":..., ...} ] }
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(aiVectorUrl)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("candidates")) {
                @SuppressWarnings("unchecked")
                java.util.List<Object> candidates = (java.util.List<Object>) response.get("candidates");
                java.util.List<String> titles = new java.util.ArrayList<>();
                for (Object obj : candidates) {
                    if (obj instanceof Map) {
                        Map<?, ?> item = (Map<?, ?>) obj;
                        if (item.containsKey("title")) {
                            titles.add((String) item.get("title"));
                        }
                    }
                }
                return titles;
            }
            throw new RuntimeException("Invalid response from AI Vector Service");
        } catch (Exception e) {
            throw new RuntimeException("Failed to call AI Vector Service: " + e.getMessage(), e);
        }
    }

    public java.util.List<String> fallbackVectorSearch(String query, String language, int limit, Throwable t) {
        log.warn("AI Vector search fallback triggered due to exception: {}", t.getMessage());
        return java.util.Collections.emptyList();
    }

    /**
     * Calls the Gemini semantic analysis endpoint (Member 2).
     * Sends the new title + scored candidates to Gemini for explainable semantic scoring.
     * Guarded by circuit breaker — falls back to empty list if unavailable.
     */
    @CircuitBreaker(name = "aiService", fallbackMethod = "fallbackGeminiAnalyze")
    public java.util.List<Map<String, Object>> getGeminiSemanticScores(
            String title, String language,
            java.util.List<Map<String, Object>> candidates) {

        log.info("Calling Gemini semantic analysis for '{}' with {} candidates", title, candidates.size());

        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("language", language);
        body.put("candidates", candidates);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(aiGeminiUrl)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("candidate_results")) {
                @SuppressWarnings("unchecked")
                java.util.List<Map<String, Object>> results =
                        (java.util.List<Map<String, Object>>) response.get("candidate_results");
                return results != null ? results : java.util.Collections.emptyList();
            }
            return java.util.Collections.emptyList();
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Gemini service: " + e.getMessage(), e);
        }
    }

    public java.util.List<Map<String, Object>> fallbackGeminiAnalyze(
            String title, String language,
            java.util.List<Map<String, Object>> candidates, Throwable t) {
        log.warn("Gemini service fallback triggered: {}", t.getMessage());
        return java.util.Collections.emptyList();
    }
}
