package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.PlanningSessionJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.PlanningSession;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PlanningSessionService {
    private final PlanningSessionJpaRepository planningSessionJpaRepository;

    public PlanningSessionService(PlanningSessionJpaRepository planningSessionJpaRepository) {
        this.planningSessionJpaRepository = planningSessionJpaRepository;
    }

    public List<PlanningSession> findAll() {
        return planningSessionJpaRepository.findAll();
    }

    public Optional<PlanningSession> findById(UUID id) {
        return planningSessionJpaRepository.findById(id);
    }

    public PlanningSession save(PlanningSession planningSession) {
        return planningSessionJpaRepository.save(planningSession);
    }

    public void deleteById(UUID id) {
        planningSessionJpaRepository.deleteById(id);
    }
}
