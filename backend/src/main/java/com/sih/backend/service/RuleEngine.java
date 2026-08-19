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
     * Static built-in blocklist — words that are ALWAYS prohibited regardless of DB configuration.
     * These cover sensitive/harmful terms that must never appear in publication titles.
     * The DB blocklist (admin-configurable) is checked separately in Rule 1.
     */
    private static final Set<String> STATIC_BLOCKED_WORDS = Set.of(
        // Terrorism / extremism
        "terrorism", "terrorist", "terrorists", "terror", "jihad", "jihadist",
        "extremist", "extremism", "militant", "militancy", "insurgent", "insurgency",
        "bomb", "bombing", "bomber", "explosion", "explosive", "blasts",
        "hijack", "hijacking", "massacre", "genocide",
        // Drugs / narcotics
        "narcotics", "narcotic", "cocaine", "heroin", "opium", "smuggling", "smuggler",
        "drug", "drugs", "trafficker", "trafficking",
        // Obscenity / hate
        "pornography", "pornographic", "obscene", "obscenity",
        // Government impersonation
        "police", "cbi", "cid", "nia", "raw", "ifs", "ips", "ias",
        "army", "navy", "airforce", "military", "paramilitary",
        "president", "parliament", "supreme court", "judiciary", "enforcement",
        "government", "sarkar", "sarkari",
        // Violence
        "murder", "rape", "assassination", "kidnapping", "ransom",
        "mafia", "gangster", "underworld", "crime", "criminal",
        "violence", "violent", "brutality", "massacre", "genocide",
        "terrorist", "terrorism", "terror"
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

        // 0. Static built-in blocklist — always prohibited, no DB lookup needed
        //    Checked first so these are caught even if admin forgets to add them to DB blocklist
        String[] tokens = normalized.split(" ");
        for (String token : tokens) {
            if (STATIC_BLOCKED_WORDS.contains(token)) {
                violations.add("Contains prohibited word: '" + token
                        + "' — this term is permanently prohibited in publication titles under PRGI guidelines");
                return violations; // hard stop — no need to check further
            }
        }

        // 1. Disallowed words check (admin-configurable DB blocklist)
        Set<String> disallowedWords = getDisallowedWords();
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

        // 6. Cross-language translation check
        List<String> translatedVariants = buildTranslatedVariants(tokens);
        for (String variant : translatedVariants) {
            if (!variant.equals(normalized) && titleRepository.existsByNormalizedText(variant)) {
                violations.add("Cross-language duplicate: '" + normalized
                        + "' is a translation of existing title '" + variant + "'");
            }
        }

        // 7. Transliteration spelling variant check
        // Normalizes common Hindi transliteration variants (aa→a, z→j, etc.)
        // so "kal ki awaaz" is caught as a variant of "kal ki awaaj"
        String canonicalized = canonicalizeTransliteration(normalized);
        if (!canonicalized.equals(normalized)) {
            // Check direct canonical match in DB
            if (titleRepository.existsByNormalizedText(canonicalized)) {
                violations.add("Spelling variant of existing title: '" + normalized
                        + "' matches '" + canonicalized + "'");
            }
            // Also check translated variants of the canonicalized form
            String[] canonTokens = canonicalized.split(" ");
            List<String> canonVariants = buildTranslatedVariants(canonTokens);
            for (String variant : canonVariants) {
                if (!variant.equals(normalized) && !variant.equals(canonicalized)
                        && titleRepository.existsByNormalizedText(variant)) {
                    violations.add("Cross-language spelling variant: '" + normalized
                            + "' is a variant/translation of existing title '" + variant + "'");
                }
            }
        }

        // Also check: does the canonicalized form of the input match the
        // canonicalized form of ANY existing title?
        // This catches "kal ki awaj" vs DB "kal ki awaaj" (both → "kal ki awaj")
        String canonInput = canonicalized.equals(normalized) ? canonicalizeTransliteration(normalized) : canonicalized;
        List<String> allTitles = titleRepository.findAll().stream()
                .map(t -> t.getNormalizedText())
                .filter(t -> t != null && !t.isBlank())
                .toList();
        for (String existing : allTitles) {
            String canonExisting = canonicalizeTransliteration(existing);
            if (canonInput.equals(canonExisting) && !normalized.equals(existing)) {
                violations.add("Spelling variant of existing title: '" + normalized
                        + "' is a transliteration variant of '" + existing + "'");
                break; // one violation is enough
            }
        }

        return violations;
    }

    /**
     * Canonicalizes common Hindi transliteration spelling variants to a single form.
     * This ensures "awaaz", "awaaj", "awaz", "awaj" all reduce to the same canonical
     * string so the exact-duplicate and translation checks catch them.
     *
     * Rules applied:
     *   z → j          (awaaz → awaaj, awaz → awaj)
     *   double vowels collapsed: aa→a, oo→u, ee→i  (awaaj→awaj, preethi→prithi)
     */
    private String canonicalizeTransliteration(String normalized) {
        if (normalized == null) return "";
        return normalized
                // z and j are the same sound in Hindi transliteration
                .replace("z", "j")
                // Collapse repeated vowels anywhere in the word
                .replace("aa", "a")
                .replace("oo", "u")
                .replace("ee", "i")
                // Collapse any resulting double spaces
                .replaceAll("\\s+", " ")
                .trim();
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
