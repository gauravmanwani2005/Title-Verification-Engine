package com.sih.backend.repository;

import com.sih.backend.model.BlocklistAffix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlocklistAffixRepository extends JpaRepository<BlocklistAffix, Long> {
    List<BlocklistAffix> findByType(String type);
    Optional<BlocklistAffix> findByAffixAndType(String affix, String type);
}
