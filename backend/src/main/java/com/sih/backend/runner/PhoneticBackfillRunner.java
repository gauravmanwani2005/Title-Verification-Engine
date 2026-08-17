package com.sih.backend.runner;

import com.sih.backend.service.PhoneticBackfillService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("migration")
public class PhoneticBackfillRunner implements CommandLineRunner {

    @Autowired
    private PhoneticBackfillService service;

    @Override
    public void run(String... args) throws Exception {
        service.backfillAll();
    }
}
