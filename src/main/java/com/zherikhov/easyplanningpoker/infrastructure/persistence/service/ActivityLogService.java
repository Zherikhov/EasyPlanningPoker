package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.ActivityLogJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.ActivityLog;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ActivityLogService {
    private final ActivityLogJpaRepository activityLogJpaRepository;

    public ActivityLogService(ActivityLogJpaRepository activityLogJpaRepository) {
        this.activityLogJpaRepository = activityLogJpaRepository;
    }

    public List<ActivityLog> findAll() {
        return activityLogJpaRepository.findAll();
    }

    public Optional<ActivityLog> findById(Long id) {
        return activityLogJpaRepository.findById(id);
    }

    public ActivityLog save(ActivityLog activityLog) {
        return activityLogJpaRepository.save(activityLog);
    }

    public void deleteById(Long id) {
        activityLogJpaRepository.deleteById(id);
    }
}
