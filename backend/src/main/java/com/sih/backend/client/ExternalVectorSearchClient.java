package com.sih.backend.client;

import com.sih.backend.dto.VectorCandidate;
import com.sih.backend.dto.VectorSearchCandidateDto;
import com.sih.backend.model.Title;
import com.sih.backend.repository.TitleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class ExternalVectorSearchClient implements VectorSearchClient {

    private static final Logger log = LoggerFactory.getLogger(ExternalVectorSearchClient.class);

    @Autowired
    private AiClient aiClient;

    @Autowired
    private TitleRepository titleRepository;

    @Value("${ai.embedding.similarity-threshold:0.0}")
    private double embeddingSimilarityThreshold;

    @Override
    public List<VectorCandidate> findNearestCandidates(String normalizedTitle, String language, int limit) {
        try {
            List<VectorSearchCandidateDto> remoteCandidates = aiClient.getVectorCandidates(normalizedTitle, language, limit);
            if (remoteCandidates == null || remoteCandidates.isEmpty()) {
                return Collections.emptyList();
            }

            List<String> rawTitles = remoteCandidates.stream()
                    .map(VectorSearchCandidateDto::getTitle)
                    .filter(Objects::nonNull)
                    .toList();
            List<String> normalizedTitles = rawTitles.stream()
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .toList();

            List<Title> matched = titleRepository.findByNormalizedTextInOrRawTextIn(normalizedTitles, rawTitles);
            Map<String, Title> byNormalized = new HashMap<>();
            Map<String, Title> byRaw = new HashMap<>();
            for (Title t : matched) {
                if (t.getNormalizedText() != null) {
                    byNormalized.put(t.getNormalizedText(), t);
                }
                if (t.getRawText() != null) {
                    byRaw.put(t.getRawText(), t);
                }
            }

            List<VectorCandidate> results = new ArrayList<>();
            int rank = 1;
            for (VectorSearchCandidateDto remoteCandidate : remoteCandidates) {
                String title = remoteCandidate.getTitle();
                if (title == null) {
                    continue;
                }

                Title mappedTitle = byNormalized.getOrDefault(title.trim().toLowerCase(), byRaw.get(title));
                double scorePercent = remoteCandidate.getVectorSimilarity() * 100.0;
                if (mappedTitle != null && scorePercent >= embeddingSimilarityThreshold) {
                    results.add(new VectorCandidate(
                            mappedTitle.getId(),
                            mappedTitle.getRawText(),
                            rank++,
                            scorePercent
                    ));
                }
                if (results.size() >= limit) break;
            }

            log.info("ExternalVectorSearchClient returned {} mapped candidates for query '{}'", results.size(), normalizedTitle);
            return results;
        } catch (Exception e) {
            log.warn("Vector search via external AI service failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
