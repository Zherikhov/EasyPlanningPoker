package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardCustomScaleItemEntity;
import com.easysprintpoker.domain.entity.BoardCustomScaleItemId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardCustomScaleItemJpaRepository extends JpaRepository<BoardCustomScaleItemEntity, BoardCustomScaleItemId> {
}
