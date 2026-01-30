package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    /**
     * Finds a user by normalized email (lowercased and trimmed stored value).
     *
     * @param emailNormalized normalized email to search for
     * @return optional user entity
     */
    Optional<UserEntity> findByEmailNormalized(String emailNormalized);

    /**
     * Checks whether a user with the given normalized email exists.
     *
     * @param emailNormalized normalized email to check
     * @return true if user exists, false otherwise
     */
    boolean existsByEmailNormalized(String emailNormalized);
}
