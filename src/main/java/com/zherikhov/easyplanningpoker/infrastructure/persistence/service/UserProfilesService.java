package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.UserProfilesJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserProfilesService {
    private final UserProfilesJpaRepository userProfilesJpaRepository;

    public UserProfilesService(UserProfilesJpaRepository userProfilesJpaRepository) {
        this.userProfilesJpaRepository = userProfilesJpaRepository;
    }

    public List<UserProfile> findAll() {
        return userProfilesJpaRepository.findAll();
    }

    public Optional<UserProfile> findById(UUID id) {
        return userProfilesJpaRepository.findById(id);
    }

    public Optional<UserProfile> findByUserId(UUID userId) {
        return userProfilesJpaRepository.findByUser_Id(userId);
    }

    public UserProfile save(UserProfile userProfile) {
        return userProfilesJpaRepository.save(userProfile);
    }

    public void deleteById(UUID id) {
        userProfilesJpaRepository.deleteById(id);
    }
}
