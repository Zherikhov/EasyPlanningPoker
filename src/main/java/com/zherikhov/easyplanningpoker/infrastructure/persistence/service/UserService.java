package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.UserJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {
    private final UserJpaRepository userJpaRepository;

    public UserService(UserJpaRepository userJpaRepository) {
        this.userJpaRepository = userJpaRepository;
    }

    public List<User> findAll() {
        return userJpaRepository.findAll();
    }

    public Optional<User> findById(UUID id) {
        return userJpaRepository.findById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userJpaRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userJpaRepository.findByEmail(email);
    }

    public User save(User user) {
        return userJpaRepository.save(user);
    }

    public void deleteById(UUID id) {
        userJpaRepository.deleteById(id);
    }
}
