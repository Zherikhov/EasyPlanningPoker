package com.zherikhov.easyplanningpoker.infrastructure.persistence.dao;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserProfilesJpaRepository extends JpaRepository<UserProfile, UUID> {
    Optional<UserProfile> findByUser_Id(UUID userId);
}
