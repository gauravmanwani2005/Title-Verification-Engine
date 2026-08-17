package com.sih.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "title")
public class Title {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "raw_text", nullable = false)
    private String rawText;

    @Column(name = "normalized_text", nullable = false)
    private String normalizedText;

    @Column(name = "phonetic_key")
    private String phoneticKey;

    @Column(name = "status", nullable = false)
    private String status;

    public Title() {}

    public Title(String rawText, String normalizedText, String phoneticKey, String status) {
        this.rawText = rawText;
        this.normalizedText = normalizedText;
        this.phoneticKey = phoneticKey;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public String getNormalizedText() {
        return normalizedText;
    }

    public void setNormalizedText(String normalizedText) {
        this.normalizedText = normalizedText;
    }

    public String getPhoneticKey() {
        return phoneticKey;
    }

    public void setPhoneticKey(String phoneticKey) {
        this.phoneticKey = phoneticKey;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
