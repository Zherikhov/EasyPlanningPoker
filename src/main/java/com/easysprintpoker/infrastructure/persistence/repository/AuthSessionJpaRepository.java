package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.AuthSessionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthSessionJpaRepository extends JpaRepository<AuthSessionEntity, UUID> {
    Page<AuthSessionEntity> findByUser_Id(UUID userId, Pageable pageable);
}
