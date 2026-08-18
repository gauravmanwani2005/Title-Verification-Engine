-- Clear tables to start with a clean state on initialization
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE title;
TRUNCATE TABLE blocklist_word;
TRUNCATE TABLE blocklist_affix;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert sample blocklist words
INSERT INTO blocklist_word (word) VALUES 
('bulletin'),
('mag');

-- Insert sample blocklist affixes
INSERT INTO blocklist_affix (affix, type) VALUES 
('national', 'PREFIX'),
('the', 'PREFIX'),
('media', 'SUFFIX'),
('digital', 'SUFFIX');

-- Insert sample existing titles — phonetic keys pre-computed (DoubleMetaphone) so phonetic
-- search works immediately without running the migration profile.
-- Key mapping (DoubleMetaphone of normalized_text):
--   namaskaar samachar → NMSK SMXR → stored as first token key
INSERT INTO title (raw_text, normalized_text, phonetic_key, status) VALUES 
('Namaskaar Samachar', 'namaskaar samachar', 'NMSK', 'APPROVED'),
('Bharat Samachar', 'bharat samachar', 'PRT', 'APPROVED'),
('Jan Samachar', 'jan samachar', 'JN', 'APPROVED'),
('Desh Samachar', 'desh samachar', 'TX', 'APPROVED'),
('Mumbai Samachar', 'mumbai samachar', 'MMP', 'APPROVED'),
('Rashtriya Samachar', 'rashtriya samachar', 'RXTR', 'APPROVED'),
('Dainik Samachar', 'dainik samachar', 'TNK', 'APPROVED'),
('Hindustan Times', 'hindustan times', 'HNTS', 'APPROVED'),
('Dainik Bhaskar', 'dainik bhaskar', 'TNK', 'APPROVED'),
('The Indian Express', 'the indian express', 'T', 'APPROVED'),
('Mumbai Mirror', 'mumbai mirror', 'MMP', 'APPROVED');

