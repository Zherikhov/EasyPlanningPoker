package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.BoardAuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardAuditLogJpaRepository extends JpaRepository<BoardAuditLogEntity, Long> {
}
