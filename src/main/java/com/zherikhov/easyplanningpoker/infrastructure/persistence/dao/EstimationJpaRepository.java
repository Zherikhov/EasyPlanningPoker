package com.zherikhov.easyplanningpoker.infrastructure.persistence.dao;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Estimation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstimationJpaRepository extends JpaRepository<Estimation, Estimation.EstimationId> {
}
