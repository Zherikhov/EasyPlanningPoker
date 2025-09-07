package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.TaskJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Task;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TaskService {
    private final TaskJpaRepository taskJpaRepository;

    public TaskService(TaskJpaRepository taskJpaRepository) {
        this.taskJpaRepository = taskJpaRepository;
    }

    public List<Task> findAll() {
        return taskJpaRepository.findAll();
    }

    public Optional<Task> findById(UUID id) {
        return taskJpaRepository.findById(id);
    }

    public Task save(Task task) {
        return taskJpaRepository.save(task);
    }

    public void deleteById(UUID id) {
        taskJpaRepository.deleteById(id);
    }
}
