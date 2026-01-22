package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.SessionParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionParticipantJpaRepository extends JpaRepository<SessionParticipantEntity, UUID> {
    List<SessionParticipantEntity> findBySession_Id(UUID sessionId);

    Optional<SessionParticipantEntity> findBySession_IdAndUser_Id(UUID sessionId, UUID userId);
}
