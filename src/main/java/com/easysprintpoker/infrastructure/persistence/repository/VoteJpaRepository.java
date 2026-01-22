package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.VoteEntity;
import com.easysprintpoker.domain.entity.VoteId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoteJpaRepository extends JpaRepository<VoteEntity, VoteId> {
    List<VoteEntity> findById_ItemId(UUID itemId);

    Optional<VoteEntity> findById_ItemIdAndId_SessionParticipantId(UUID itemId, UUID sessionParticipantId);

    void deleteById_ItemId(UUID itemId);
}
