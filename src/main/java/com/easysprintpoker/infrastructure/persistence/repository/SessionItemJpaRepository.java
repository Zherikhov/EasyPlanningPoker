package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.SessionItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SessionItemJpaRepository extends JpaRepository<SessionItemEntity, UUID> {
}
