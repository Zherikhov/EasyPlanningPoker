package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.AuthIdentityEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthIdentityJpaRepository extends JpaRepository<AuthIdentityEntity, UUID> {
}
