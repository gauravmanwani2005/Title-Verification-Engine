package com.sih.backend.client;

import com.sih.backend.dto.VectorSearchCandidateDto;
import com.sih.backend.dto.VectorSearchRequestDto;
import com.sih.backend.dto.VectorSearchResponseDto;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AiClient {

    private static final Logger log = LoggerFactory.getLogger(AiClient.class);

    private final RestClient restClient;

    @Value("${ai.service.base-url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    @Value("${ai.service.semantic-path:/api/semantic/similarity}")
    private String semanticPath;

    @Value("${ai.service.vector-path:/api/vector/search}")
    private String vectorPath;

    public AiClient(@Value("${ai.service.timeout-ms:5000}") int timeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
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
                    .uri(buildUrl(semanticPath))
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

    @CircuitBreaker(name = "aiService", fallbackMethod = "fallbackVectorCandidates")
    public List<VectorSearchCandidateDto> getVectorCandidates(String title, String language, int limit) {
        log.info("Calling vector ANN service for title '{}' with limit {}", title, limit);

        try {
            VectorSearchResponseDto response = restClient.post()
                    .uri(buildUrl(vectorPath))
                    .body(new VectorSearchRequestDto(title, language, limit))
                    .retrieve()
                    .body(VectorSearchResponseDto.class);

            if (response == null || response.getCandidates() == null) {
                throw new RuntimeException("Invalid response from Vector ANN service");
            }
            return response.getCandidates();
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Vector ANN service: " + e.getMessage(), e);
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

    public List<VectorSearchCandidateDto> fallbackVectorCandidates(String title, String language, int limit, Throwable t) {
        log.warn("Vector ANN service fallback triggered due to exception: {}", t.getMessage());
        return Collections.emptyList();
    }

    private String buildUrl(String path) {
        if (path == null || path.isBlank()) {
            return aiServiceBaseUrl;
        }
        if (aiServiceBaseUrl.endsWith("/") && path.startsWith("/")) {
            return aiServiceBaseUrl.substring(0, aiServiceBaseUrl.length() - 1) + path;
        }
        if (!aiServiceBaseUrl.endsWith("/") && !path.startsWith("/")) {
            return aiServiceBaseUrl + "/" + path;
        }
        return aiServiceBaseUrl + path;
    }
}
