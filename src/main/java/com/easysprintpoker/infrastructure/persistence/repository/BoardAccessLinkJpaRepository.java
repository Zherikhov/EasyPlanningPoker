package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardAccessLinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BoardAccessLinkJpaRepository extends JpaRepository<BoardAccessLinkEntity, UUID> {
}
