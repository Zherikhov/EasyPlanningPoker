package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.EstimationJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Estimation;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Estimation.EstimationId;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EstimationService {
    private final EstimationJpaRepository estimationJpaRepository;

    public EstimationService(EstimationJpaRepository estimationJpaRepository) {
        this.estimationJpaRepository = estimationJpaRepository;
    }

    public List<Estimation> findAll() {
        return estimationJpaRepository.findAll();
    }

    public Optional<Estimation> findById(EstimationId id) {
        return estimationJpaRepository.findById(id);
    }

    public Estimation save(Estimation estimation) {
        return estimationJpaRepository.save(estimation);
    }

    public void deleteById(EstimationId id) {
        estimationJpaRepository.deleteById(id);
    }
}
