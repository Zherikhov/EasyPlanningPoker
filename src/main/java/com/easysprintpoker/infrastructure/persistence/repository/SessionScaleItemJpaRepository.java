package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.SessionScaleItemEntity;
import com.easysprintpoker.domain.entity.SessionScaleItemId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SessionScaleItemJpaRepository extends JpaRepository<SessionScaleItemEntity, SessionScaleItemId> {
    List<SessionScaleItemEntity> findBySession_IdOrderById_PositionAsc(UUID sessionId);
}
