package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BoardSettingsJpaRepository extends JpaRepository<BoardSettingsEntity, UUID> {
}
