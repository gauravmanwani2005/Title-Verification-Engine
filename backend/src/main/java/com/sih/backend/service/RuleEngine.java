package com.sih.backend.service;

import com.sih.backend.model.BlocklistAffix;
import com.sih.backend.repository.BlocklistAffixRepository;
import com.sih.backend.repository.BlocklistWordRepository;
import com.sih.backend.repository.TitleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RuleEngine {

    private static final Set<String> PERIODICITY_WORDS = Set.of(
            "daily", "weekly", "monthly", "yearly", "fortnightly", 
            "quarterly", "biweekly", "bimonthly", "weekend", "annual",
            "journal", "magazine", "news", "samachar", "patrika"
    );

    @Autowired
    private BlocklistWordRepository blocklistWordRepository;

    @Autowired
    private BlocklistAffixRepository blocklistAffixRepository;

    @Autowired
    private TitleRepository titleRepository;

    /**
     * Cacheable retrieval of all disallowed words in lowercase.
     */
    @Cacheable("blocklistWords")
    public Set<String> getDisallowedWords() {
        return blocklistWordRepository.findAll().stream()
                .map(w -> w.getWord().toLowerCase().trim())
                .collect(Collectors.toSet());
    }

    /**
     * Cacheable retrieval of all disallowed affixes.
     */
    @Cacheable("blocklistAffixes")
    public List<BlocklistAffix> getDisallowedAffixes() {
        return blocklistAffixRepository.findAll();
    }

    /**
     * Evaluates a normalized title against all business rules.
     * Returns a list of rule violations. If empty, the title passed all rule checks.
     */
    public List<String> check(String normalized) {
        List<String> violations = new ArrayList<>();
        if (normalized == null || normalized.isBlank()) {
            return violations;
        }

        // 1. Disallowed words check
        Set<String> disallowedWords = getDisallowedWords();
        String[] tokens = normalized.split(" ");
        for (String token : tokens) {
            if (disallowedWords.contains(token)) {
                violations.add("Contains disallowed word: '" + token + "'");
            }
        }

        // 2. Disallowed prefix/suffix check
        List<BlocklistAffix> affixes = getDisallowedAffixes();
        for (BlocklistAffix affix : affixes) {
            String affixVal = affix.getAffix().toLowerCase().trim();
            if ("PREFIX".equalsIgnoreCase(affix.getType()) && normalized.startsWith(affixVal)) {
                violations.add("Contains disallowed prefix: '" + affix.getAffix() + "'");
            } else if ("SUFFIX".equalsIgnoreCase(affix.getType()) && normalized.endsWith(affixVal)) {
                violations.add("Contains disallowed suffix: '" + affix.getAffix() + "'");
            }
        }

        // 3. Exact duplicate check
        if (titleRepository.existsByNormalizedText(normalized)) {
            violations.add("Exact duplicate of an existing title: '" + normalized + "'");
        }

        // 4. Combination-title check
        if (tokens.length > 1) {
            for (int i = 1; i < tokens.length; i++) {
                String left = String.join(" ", Arrays.copyOfRange(tokens, 0, i));
                String right = String.join(" ", Arrays.copyOfRange(tokens, i, tokens.length));
                if (titleRepository.existsByNormalizedText(left) &&
                        titleRepository.existsByNormalizedText(right)) {
                    violations.add("Combines existing titles: '" + left + "' + '" + right + "'");
                }
            }
        }

        // 5. Periodicity check
        String stripped = stripPeriodicity(normalized);
        if (!stripped.equals(normalized) && !stripped.isBlank()) {
            if (titleRepository.existsByNormalizedText(stripped)) {
                violations.add("Violates periodicity check: matches existing root title '" + stripped + "' after stripping periodicity terms");
            }
        }

        return violations;
    }

    private String stripPeriodicity(String normalized) {
        String[] tokens = normalized.split(" ");
        List<String> remaining = new ArrayList<>();
        for (String token : tokens) {
            if (!PERIODICITY_WORDS.contains(token)) {
                remaining.add(token);
            }
        }
        return String.join(" ", remaining);
    }
}
