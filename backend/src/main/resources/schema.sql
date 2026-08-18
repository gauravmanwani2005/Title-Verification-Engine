-- ─── Title table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS title (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    raw_text        VARCHAR(255) NOT NULL,
    normalized_text VARCHAR(255) NOT NULL,
    phonetic_key    VARCHAR(50),
    status          VARCHAR(20) NOT NULL,
    INDEX idx_phonetic_key (phonetic_key),
    FULLTEXT INDEX idx_title_ngram (normalized_text) WITH PARSER ngram
) ENGINE=InnoDB;

-- ─── Blocklist tables ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocklist_word (
    id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blocklist_affix (
    id    BIGINT PRIMARY KEY AUTO_INCREMENT,
    affix VARCHAR(50)  NOT NULL UNIQUE,
    type  VARCHAR(10)  NOT NULL
) ENGINE=InnoDB;

-- ─── Submission audit table ───────────────────────────────────────────────────
-- New columns (top_embedding_score, top_semantic_score, final_score,
--              member1_model, member2_model) must be added manually to
-- existing databases via:
--   ALTER TABLE submission ADD COLUMN top_embedding_score DOUBLE;
--   ALTER TABLE submission ADD COLUMN top_semantic_score  DOUBLE;
--   ALTER TABLE submission ADD COLUMN final_score         DOUBLE;
--   ALTER TABLE submission ADD COLUMN member1_model       VARCHAR(100);
--   ALTER TABLE submission ADD COLUMN member2_model       VARCHAR(100);
CREATE TABLE IF NOT EXISTS submission (
    id                       VARCHAR(36)  PRIMARY KEY,
    title                    VARCHAR(255) NOT NULL,
    language                 VARCHAR(10)  NOT NULL,
    applicant_id             VARCHAR(50)  NOT NULL,
    verdict                  VARCHAR(20)  NOT NULL,
    verification_probability DOUBLE       NOT NULL,
    similarity_score         DOUBLE       NOT NULL,
    top_embedding_score      DOUBLE,
    top_semantic_score       DOUBLE,
    final_score              DOUBLE,
    member1_model            VARCHAR(100),
    member2_model            VARCHAR(100),
    reasons                  TEXT,
    matched_titles           TEXT,
    rule_violations          TEXT,
    ai_call_invoked          BOOLEAN      NOT NULL,
    officer_decision         VARCHAR(20),
    officer_id               VARCHAR(100),
    officer_note             TEXT,
    decided_at               DATETIME,
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
