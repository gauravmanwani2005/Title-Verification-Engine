package com.sih.backend.dto;

public class BlocklistAffixDto {
    private Long id;
    private String affix;
    private String type; // PREFIX or SUFFIX

    public BlocklistAffixDto() {}

    public BlocklistAffixDto(Long id, String affix, String type) {
        this.id = id;
        this.affix = affix;
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAffix() {
        return affix;
    }

    public void setAffix(String affix) {
        this.affix = affix;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
