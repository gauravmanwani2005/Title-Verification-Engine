-- Create title table with index for phonetic key and FULLTEXT index for fuzzy matches
CREATE TABLE IF NOT EXISTS title (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    raw_text VARCHAR(255) NOT NULL,
    normalized_text VARCHAR(255) NOT NULL,
    phonetic_key VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    INDEX idx_phonetic_key (phonetic_key),
    FULLTEXT INDEX idx_title_ngram (normalized_text) WITH PARSER ngram
) ENGINE=InnoDB;

-- Create blocklist_word table
CREATE TABLE IF NOT EXISTS blocklist_word (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Create blocklist_affix table
CREATE TABLE IF NOT EXISTS blocklist_affix (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    affix VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL -- 'PREFIX' or 'SUFFIX'
) ENGINE=InnoDB;

-- Create submission audit table
CREATE TABLE IF NOT EXISTS submission (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    applicant_id VARCHAR(50) NOT NULL,
    verdict VARCHAR(20) NOT NULL,
    verification_probability DOUBLE NOT NULL,
    similarity_score DOUBLE NOT NULL,
    reasons TEXT, -- JSON or string list
    matched_titles TEXT, -- JSON list of matches
    rule_violations TEXT, -- JSON list of violations
    ai_call_invoked BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
