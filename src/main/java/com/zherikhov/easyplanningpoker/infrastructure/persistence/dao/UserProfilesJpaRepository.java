package com.zherikhov.easyplanningpoker.infrastructure.persistence.dao;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfiles;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfilesJpaRepository extends JpaRepository<UserProfiles, com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User> {
}
