package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BillingPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingPlanJpaRepository extends JpaRepository<BillingPlanEntity, UUID> {
}
