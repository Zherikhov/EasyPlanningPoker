package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
}
