package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.EstimationSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EstimationSessionJpaRepository extends JpaRepository<EstimationSessionEntity, UUID> {
}
