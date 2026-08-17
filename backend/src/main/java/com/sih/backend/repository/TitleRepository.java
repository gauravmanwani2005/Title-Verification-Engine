package com.sih.backend.repository;

import com.sih.backend.model.Title;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TitleRepository extends JpaRepository<Title, Long> {

    boolean existsByNormalizedText(String normalizedText);

    List<Title> findByPhoneticKey(String phoneticKey);

    Page<Title> findByPhoneticKeyIsNull(Pageable pageable);

    @Query(value = """
        SELECT t.* FROM title t
        WHERE MATCH(t.normalized_text) AGAINST (:input IN NATURAL LANGUAGE MODE)
        ORDER BY MATCH(t.normalized_text) AGAINST (:input IN NATURAL LANGUAGE MODE) DESC
        LIMIT 100
        """, nativeQuery = true)
    List<Title> findFuzzyMatches(@Param("input") String input);

    @Query("SELECT t FROM Title t WHERE t.rawText LIKE %:query% OR t.normalizedText LIKE %:query%")
    Page<Title> searchTitles(@Param("query") String query, Pageable pageable);
}
