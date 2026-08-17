package com.sih.backend.dto;

public class BlocklistWordDto {
    private Long id;
    private String word;

    public BlocklistWordDto() {}

    public BlocklistWordDto(Long id, String word) {
        this.id = id;
        this.word = word;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }
}
