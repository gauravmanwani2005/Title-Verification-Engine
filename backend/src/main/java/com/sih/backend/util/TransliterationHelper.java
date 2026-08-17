package com.sih.backend.util;

import com.ibm.icu.text.Transliterator;

public class TransliterationHelper {

    private static final Transliterator DEVANAGARI_TO_LATIN = 
            Transliterator.getInstance("Devanagari-Latin");

    /**
     * Transliterates Indian script text (specifically Devanagari) to Latin script.
     */
    public static String transliterate(String text) {
        if (text == null) {
            return "";
        }
        return DEVANAGARI_TO_LATIN.transliterate(text);
    }

    /**
     * Normalizes a raw input title by:
     * 1. Transliterating Devanagari to Latin.
     * 2. Converting to lowercase.
     * 3. Removing non-alphanumeric characters (preserving spaces).
     * 4. Collapsing multiple spaces and trimming.
     */
    public static String normalize(String text) {
        if (text == null) {
            return "";
        }
        
        // Transliterate first to handle Devanagari
        String transliterated = transliterate(text);
        
        // Convert to lower case
        String lowercased = transliterated.toLowerCase();
        
        // Remove special punctuation/characters but preserve spaces and letters/digits
        String cleanText = lowercased.replaceAll("[^a-z0-9\\s]", " ");
        
        // Collapse spaces and trim
        return cleanText.replaceAll("\\s+", " ").trim();
    }
}
