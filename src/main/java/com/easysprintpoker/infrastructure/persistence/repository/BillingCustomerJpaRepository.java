package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BillingCustomerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingCustomerJpaRepository extends JpaRepository<BillingCustomerEntity, UUID> {
}
