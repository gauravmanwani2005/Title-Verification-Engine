package com.sih.backend.service;

import com.sih.backend.util.TransliterationHelper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TransliterationTest {

    @Test
    void testTransliterationAndNormalization() {
        // "नमस्कार समाचार" (Namaskar Samachar in Hindi)
        String raw = "नमस्कार समाचार";
        String normalized = TransliterationHelper.normalize(raw);
        
        assertNotNull(normalized);
        assertFalse(normalized.isBlank());
        
        // Output should be normalized lowercase latin text (e.g. "namaskara samacara" or similar)
        assertTrue(normalized.matches("[a-z0-9\\s]+"), "Normalized text must only contain lowercase letters, numbers, and spaces");
        assertTrue(normalized.contains("namas"), "Should contain transliterated letters");
    }

    @Test
    void testPhoneticKeyCalculation() {
        PhoneticService service = new PhoneticService();
        String key1 = service.computePhoneticKey("namaskar");
        String key2 = service.computePhoneticKey("namaskaar");
        
        assertNotNull(key1);
        assertFalse(key1.isBlank());
        
        // DoubleMetaphone should compute the same phonetic key for "namaskar" and "namaskaar"
        assertEquals(key1, key2, "DoubleMetaphone phonetic keys should match for highly similar spellings");
    }
}
