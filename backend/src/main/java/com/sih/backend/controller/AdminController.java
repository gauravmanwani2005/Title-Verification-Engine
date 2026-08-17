package com.sih.backend.controller;

import com.sih.backend.dto.BlocklistAffixDto;
import com.sih.backend.dto.BlocklistWordDto;
import com.sih.backend.model.BlocklistAffix;
import com.sih.backend.model.BlocklistWord;
import com.sih.backend.repository.BlocklistAffixRepository;
import com.sih.backend.repository.BlocklistWordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/blocklist")
public class AdminController {

    @Autowired
    private BlocklistWordRepository blocklistWordRepository;

    @Autowired
    private BlocklistAffixRepository blocklistAffixRepository;

    @Autowired
    private CacheManager cacheManager;

    // --- Blocklist Words ---

    @GetMapping("/words")
    public ResponseEntity<List<BlocklistWordDto>> getBlocklistWords() {
        List<BlocklistWordDto> words = blocklistWordRepository.findAll().stream()
                .map(w -> new BlocklistWordDto(w.getId(), w.getWord()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(words);
    }

    @PostMapping("/words")
    public ResponseEntity<BlocklistWordDto> addBlocklistWord(@RequestBody BlocklistWordDto dto) {
        if (dto.getWord() == null || dto.getWord().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        BlocklistWord word = new BlocklistWord(dto.getWord().trim().toLowerCase());
        BlocklistWord saved = blocklistWordRepository.save(word);
        evictBlocklistCaches();
        return ResponseEntity.status(HttpStatus.CREATED).body(new BlocklistWordDto(saved.getId(), saved.getWord()));
    }

    @DeleteMapping("/words/{id}")
    public ResponseEntity<Void> deleteBlocklistWord(@PathVariable Long id) {
        if (!blocklistWordRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        blocklistWordRepository.deleteById(id);
        evictBlocklistCaches();
        return ResponseEntity.noContent().build();
    }

    // --- Blocklist Affixes ---

    @GetMapping("/affixes")
    public ResponseEntity<List<BlocklistAffixDto>> getBlocklistAffixes() {
        List<BlocklistAffixDto> affixes = blocklistAffixRepository.findAll().stream()
                .map(a -> new BlocklistAffixDto(a.getId(), a.getAffix(), a.getType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(affixes);
    }

    @PostMapping("/affixes")
    public ResponseEntity<BlocklistAffixDto> addBlocklistAffix(@RequestBody BlocklistAffixDto dto) {
        if (dto.getAffix() == null || dto.getAffix().isBlank() || dto.getType() == null) {
            return ResponseEntity.badRequest().build();
        }
        String type = dto.getType().trim().toUpperCase();
        if (!"PREFIX".equals(type) && !"SUFFIX".equals(type)) {
            return ResponseEntity.badRequest().build();
        }
        
        BlocklistAffix affix = new BlocklistAffix(dto.getAffix().trim().toLowerCase(), type);
        BlocklistAffix saved = blocklistAffixRepository.save(affix);
        evictBlocklistCaches();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BlocklistAffixDto(saved.getId(), saved.getAffix(), saved.getType()));
    }

    @DeleteMapping("/affixes/{id}")
    public ResponseEntity<Void> deleteBlocklistAffix(@PathVariable Long id) {
        if (!blocklistAffixRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        blocklistAffixRepository.deleteById(id);
        evictBlocklistCaches();
        return ResponseEntity.noContent().build();
    }

    /**
     * Evicts the Spring Cache manager caches for blocklists, ensuring rules update in real-time.
     */
    private void evictBlocklistCaches() {
        Cache wordsCache = cacheManager.getCache("blocklistWords");
        if (wordsCache != null) {
            wordsCache.clear();
        }
        Cache affixesCache = cacheManager.getCache("blocklistAffixes");
        if (affixesCache != null) {
            affixesCache.clear();
        }
    }
}
