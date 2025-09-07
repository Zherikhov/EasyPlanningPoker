package com.zherikhov.easyplanningpoker.infrastructure.persistence.service;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.UserProfilesJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfiles;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserProfilesService {
    private final UserProfilesJpaRepository userProfilesJpaRepository;

    public UserProfilesService(UserProfilesJpaRepository userProfilesJpaRepository) {
        this.userProfilesJpaRepository = userProfilesJpaRepository;
    }

    public List<UserProfiles> findAll() {
        return userProfilesJpaRepository.findAll();
    }

    public Optional<UserProfiles> findById(User user) {
        return userProfilesJpaRepository.findById(user);
    }

    public UserProfiles save(UserProfiles userProfiles) {
        return userProfilesJpaRepository.save(userProfiles);
    }

    public void deleteById(User user) {
        userProfilesJpaRepository.deleteById(user);
    }
}
