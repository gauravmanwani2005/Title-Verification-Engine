package com.sih.backend.service;

import org.apache.commons.codec.language.DoubleMetaphone;
import org.springframework.stereotype.Service;

@Service
public class PhoneticService {

    private final DoubleMetaphone metaphone;

    public PhoneticService() {
        this.metaphone = new DoubleMetaphone();
    }

    /**
     * Computes the DoubleMetaphone phonetic key for a normalized title.
     * Note: DoubleMetaphone handles Latin characters. We ensure transliteration is run
     * prior to calling this method.
     */
    public String computePhoneticKey(String normalizedTitle) {
        if (normalizedTitle == null || normalizedTitle.isBlank()) {
            return "";
        }
        return metaphone.doubleMetaphone(normalizedTitle);
    }
}
