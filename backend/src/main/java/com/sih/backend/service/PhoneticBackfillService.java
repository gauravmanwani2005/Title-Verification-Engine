package com.sih.backend.service;

import com.sih.backend.model.Title;
import com.sih.backend.repository.TitleRepository;
import com.sih.backend.util.TransliterationHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PhoneticBackfillService {

    private static final Logger log = LoggerFactory.getLogger(PhoneticBackfillService.class);
    private static final int BATCH_SIZE = 1000;

    @Autowired
    private TitleRepository titleRepository;

    @Autowired
    private PhoneticService phoneticService;

    /**
     * Iteratively processes and updates all records in batches until no records
     * remain without a phonetic key.
     */
    public void backfillAll() {
        int updatedInBatch;
        int total = 0;
        log.info("Starting phonetic backfill migration...");
        
        do {
            updatedInBatch = backfillBatch();
            total += updatedInBatch;
            log.info("Backfilled {} titles so far.", total);
        } while (updatedInBatch == BATCH_SIZE);
        
        log.info("Phonetic backfill migration completed. Total backfilled: {}", total);
    }

    /**
     * Executes the backfill for a single batch under a single transaction.
     * Re-queries page 0 as updated records will fall out of the 'IS NULL' filter.
     */
    @Transactional
    public int backfillBatch() {
        List<Title> batch = titleRepository
                .findByPhoneticKeyIsNull(PageRequest.of(0, BATCH_SIZE))
                .getContent();

        if (batch.isEmpty()) {
            return 0;
        }

        for (Title t : batch) {
            String normalized = TransliterationHelper.normalize(t.getRawText());
            t.setNormalizedText(normalized);
            t.setPhoneticKey(phoneticService.computePhoneticKey(normalized));
        }

        titleRepository.saveAll(batch);
        return batch.size();
    }
}
