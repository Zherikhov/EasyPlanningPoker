package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.SessionEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionEventJpaRepository extends JpaRepository<SessionEventEntity, Long> {
}
