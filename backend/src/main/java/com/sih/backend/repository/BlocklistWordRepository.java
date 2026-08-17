package com.sih.backend.repository;

import com.sih.backend.model.BlocklistWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlocklistWordRepository extends JpaRepository<BlocklistWord, Long> {
    Optional<BlocklistWord> findByWord(String word);
}
