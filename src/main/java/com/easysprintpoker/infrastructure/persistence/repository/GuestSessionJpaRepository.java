package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.GuestSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GuestSessionJpaRepository extends JpaRepository<GuestSessionEntity, UUID> {
}
