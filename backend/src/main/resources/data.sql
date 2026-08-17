-- Clear tables to start with a clean state on initialization
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE title;
TRUNCATE TABLE blocklist_word;
TRUNCATE TABLE blocklist_affix;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert sample blocklist words
INSERT INTO blocklist_word (word) VALUES 
('bulletin'),
('express'),
('mag');

-- Insert sample blocklist affixes
INSERT INTO blocklist_affix (affix, type) VALUES 
('national', 'PREFIX'),
('the', 'PREFIX'),
('media', 'SUFFIX'),
('digital', 'SUFFIX');

-- Insert sample existing titles — includes several "Samachar" variants to exercise multi-match responses
INSERT INTO title (raw_text, normalized_text, phonetic_key, status) VALUES 
('Namaskaar Samachar', 'namaskaar samachar', NULL, 'APPROVED'),
('Bharat Samachar', 'bharat samachar', NULL, 'APPROVED'),
('Jan Samachar', 'jan samachar', NULL, 'APPROVED'),
('Desh Samachar', 'desh samachar', NULL, 'APPROVED'),
('Mumbai Samachar', 'mumbai samachar', NULL, 'APPROVED'),
('Rashtriya Samachar', 'rashtriya samachar', NULL, 'APPROVED'),
('Dainik Samachar', 'dainik samachar', NULL, 'APPROVED'),
('Hindustan Times', 'hindustan times', NULL, 'APPROVED'),
('Dainik Bhaskar', 'dainik bhaskar', NULL, 'APPROVED'),
('The Indian Express', 'the indian express', NULL, 'APPROVED'),
('Mumbai Mirror', 'mumbai mirror', NULL, 'APPROVED');

