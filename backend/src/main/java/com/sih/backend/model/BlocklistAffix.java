package com.sih.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "blocklist_affix")
public class BlocklistAffix {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "affix", nullable = false, unique = true)
    private String affix;

    @Column(name = "type", nullable = false)
    private String type; // PREFIX or SUFFIX

    public BlocklistAffix() {}

    public BlocklistAffix(String affix, String type) {
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
