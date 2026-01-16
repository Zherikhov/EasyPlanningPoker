package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardGuestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BoardGuestJpaRepository extends JpaRepository<BoardGuestEntity, UUID> {
}
