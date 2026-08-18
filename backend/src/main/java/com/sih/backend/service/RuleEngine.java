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

    /**
     * Cross-language word translation map (Hindi transliterated ↔ English).
     * Each entry maps a word token to its translation equivalents.
     * Used in Rule 6 to catch titles that are translations of existing registered titles.
     *
     * Key   = normalized token as it appears after transliteration
     * Value = list of English (or other language) equivalents
     */
    private static final Map<String, List<String>> TRANSLATION_MAP;
    static {
        Map<String, List<String>> m = new HashMap<>();
        // Time / day words
        m.put("kal",        List.of("yesterday", "tomorrow"));
        m.put("aaj",        List.of("today"));
        m.put("subah",      List.of("morning"));
        m.put("sandhya",    List.of("evening"));
        m.put("raat",       List.of("night"));
        m.put("din",        List.of("day"));
        // Voice / news words
        m.put("awaj",       List.of("voice"));
        m.put("awaaj",      List.of("voice"));
        m.put("awaz",       List.of("voice"));
        m.put("awaaz",      List.of("voice"));
        m.put("shabd",      List.of("word"));
        m.put("khabar",     List.of("news"));
        m.put("samachar",   List.of("news"));
        m.put("sandesh",    List.of("message"));
        m.put("varta",      List.of("news", "talk"));
        m.put("patrika",    List.of("magazine", "journal"));
        // Country / nation words
        m.put("bharat",     List.of("india"));
        m.put("desh",       List.of("country", "nation"));
        m.put("rashtra",    List.of("nation"));
        m.put("rashtriya",  List.of("national"));
        // People / society
        m.put("jan",        List.of("people", "public"));
        m.put("lok",        List.of("people", "public", "folk"));
        m.put("janta",      List.of("public", "people"));
        m.put("praja",      List.of("people", "public"));
        // Possessive / relational
        m.put("ki",         List.of("of", "s", "'s"));   // "kal ki" = "yesterday's"
        m.put("ka",         List.of("of"));
        m.put("ke",         List.of("of"));
        m.put("s",          List.of("ki", "ka", "ke"));   // possessive artifact from "yesterday's" → "yesterday s"
        // Common newspaper words
        m.put("dainik",     List.of("daily"));
        m.put("pratidin",   List.of("daily", "everyday"));
        m.put("saaptahik",  List.of("weekly"));
        m.put("masik",      List.of("monthly"));
        m.put("times",      List.of("samay", "kal"));
        m.put("mirror",     List.of("darpan", "aaina"));
        m.put("herald",     List.of("udghoshak"));
        m.put("chronicle",  List.of("itihas", "vritant"));
        m.put("morning",    List.of("subah", "pratah"));
        m.put("evening",    List.of("sandhya", "sham"));
        m.put("yesterday",  List.of("kal"));
        m.put("tomorrow",   List.of("kal"));
        m.put("today",      List.of("aaj"));
        m.put("voice",      List.of("awaj", "awaaj", "awaz", "awaaz"));
        m.put("india",      List.of("bharat", "hindustan"));
        m.put("national",   List.of("rashtriya"));
        m.put("people",     List.of("jan", "lok", "janta"));
        m.put("news",       List.of("khabar", "samachar", "varta"));
        TRANSLATION_MAP = Collections.unmodifiableMap(m);
    }

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
            if ("PREFIX".equalsIgnoreCase(affix.getType())) {
                if (normalized.equals(affixVal) || normalized.startsWith(affixVal + " ")) {
                    violations.add("Contains disallowed prefix: '" + affix.getAffix() + "'");
                }
            } else if ("SUFFIX".equalsIgnoreCase(affix.getType())) {
                if (normalized.equals(affixVal) || normalized.endsWith(" " + affixVal)) {
                    violations.add("Contains disallowed suffix: '" + affix.getAffix() + "'");
                }
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
        if (!stripped.isBlank()) {
            Optional<com.sih.backend.model.Title> conflictingTitle = titleRepository.findAll().stream()
                    .filter(t -> !t.getNormalizedText().equalsIgnoreCase(normalized))
                    .filter(t -> {
                        String existingStripped = stripPeriodicity(t.getNormalizedText());
                        return existingStripped.equalsIgnoreCase(stripped);
                    })
                    .findFirst();

            if (conflictingTitle.isPresent()) {
                violations.add("Violates periodicity check: matches existing title '" + conflictingTitle.get().getRawText() + "' under periodicity rules");
            }
        }

        // 6. Cross-language translation check
        // Translate tokens using the bilingual map and check if the translated
        // form of the input matches any existing registered title.
        List<String> translatedVariants = buildTranslatedVariants(tokens);
        for (String variant : translatedVariants) {
            if (!variant.equals(normalized) && titleRepository.existsByNormalizedText(variant)) {
                violations.add("Cross-language duplicate: '" + normalized
                        + "' is a translation of existing title '" + variant + "'");
            }
        }

        return violations;
    }

    /**
     * Builds translated variants of the input by replacing each token
     * with its cross-language equivalents (one variant per translated token).
     * Returns a list of candidate normalized strings to check against the DB.
     */
    private List<String> buildTranslatedVariants(String[] tokens) {
        List<String> variants = new ArrayList<>();

        // Single-pass: for each token that has a translation, generate a full
        // variant where that token is replaced by each of its translations.
        for (int i = 0; i < tokens.length; i++) {
            List<String> translations = TRANSLATION_MAP.get(tokens[i]);
            if (translations == null) continue;
            for (String translation : translations) {
                String[] copy = Arrays.copyOf(tokens, tokens.length);
                copy[i] = translation;
                variants.add(String.join(" ", copy).trim());
            }
        }

        // Also try fully translated version (replace ALL translatable tokens at once)
        String[] fullyTranslated = Arrays.copyOf(tokens, tokens.length);
        boolean anyReplaced = false;
        for (int i = 0; i < fullyTranslated.length; i++) {
            List<String> translations = TRANSLATION_MAP.get(fullyTranslated[i]);
            if (translations != null && !translations.isEmpty()) {
                fullyTranslated[i] = translations.get(0); // use primary translation
                anyReplaced = true;
            }
        }
        if (anyReplaced) {
            variants.add(String.join(" ", fullyTranslated).trim());
        }

        return variants;
    }

    private String stripPeriodicity(String normalized) {
        String[] tokens = normalized.split("\\s+");
        List<String> remaining = new ArrayList<>();
        for (String token : tokens) {
            String cleanToken = token.toLowerCase().trim();
            if (!PERIODICITY_WORDS.contains(cleanToken)) {
                remaining.add(token);
            }
        }
        return String.join(" ", remaining).trim();
    }
}
