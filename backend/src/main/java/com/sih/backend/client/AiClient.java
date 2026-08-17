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

    @Value("${ai.service.url:http://localhost:5000/api/semantic/similarity}")
    private String aiServiceUrl;

    public AiClient() {
        this.restClient = RestClient.builder().build();
    }

    /**
     * Calls external AI service to obtain semantic similarity between the candidate and the input.
     * Guarded by Resilience4j circuit breaker.
     */
    @CircuitBreaker(name = "aiService", fallbackMethod = "fallbackSemanticSimilarity")
    public double getSemanticSimilarity(String newTitle, String existingTitle, String language) {
        log.info("Calling external AI service for semantic similarity: '{}' vs '{}' ({})", newTitle, existingTitle, language);

        Map<String, String> body = new HashMap<>();
        body.put("title", newTitle);
        body.put("candidate", existingTitle);
        body.put("language", language);

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
    public double fallbackSemanticSimilarity(String newTitle, String existingTitle, String language, Throwable t) {
        log.warn("AI service fallback triggered due to exception: {}", t.getMessage());
        // Default fallback score is 0.0, indicating no verified semantic similarity
        return 0.0;
    }
}
