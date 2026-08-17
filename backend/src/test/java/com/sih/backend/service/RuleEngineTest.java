package com.sih.backend.service;

import com.sih.backend.model.BlocklistAffix;
import com.sih.backend.model.BlocklistWord;
import com.sih.backend.repository.BlocklistAffixRepository;
import com.sih.backend.repository.BlocklistWordRepository;
import com.sih.backend.repository.TitleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RuleEngineTest {

    @Mock
    private BlocklistWordRepository blocklistWordRepository;

    @Mock
    private BlocklistAffixRepository blocklistAffixRepository;

    @Mock
    private TitleRepository titleRepository;

    @InjectMocks
    private RuleEngine ruleEngine;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCheckDisallowedWords() {
        when(blocklistWordRepository.findAll()).thenReturn(List.of(new BlocklistWord("bulletin")));
        
        // Cache needs to be populated/mocked by the direct call in test environment
        List<String> violations = ruleEngine.check("daily bulletin");
        assertTrue(violations.stream().anyMatch(v -> v.contains("Contains disallowed word: 'bulletin'")));
    }

    @Test
    void testCheckDisallowedAffixes() {
        when(blocklistAffixRepository.findAll()).thenReturn(List.of(
                new BlocklistAffix("national", "PREFIX"),
                new BlocklistAffix("media", "SUFFIX")
        ));

        List<String> violationsPrefix = ruleEngine.check("national samachar");
        assertTrue(violationsPrefix.stream().anyMatch(v -> v.contains("Contains disallowed prefix: 'national'")));

        List<String> violationsSuffix = ruleEngine.check("samachar media");
        assertTrue(violationsSuffix.stream().anyMatch(v -> v.contains("Contains disallowed suffix: 'media'")));
    }

    @Test
    void testCombinationTitleCheck() {
        when(titleRepository.existsByNormalizedText("hindustan")).thenReturn(true);
        when(titleRepository.existsByNormalizedText("times")).thenReturn(true);

        List<String> violations = ruleEngine.check("hindustan times");
        assertTrue(violations.stream().anyMatch(v -> v.contains("Combines existing titles: 'hindustan' + 'times'")));
    }
}
