package com.easysprintpoker.infrastructure.persistence.repository;

import com.easysprintpoker.domain.entity.AuthIdentityEntity;
import com.easysprintpoker.domain.enums.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthIdentityJpaRepository extends JpaRepository<AuthIdentityEntity, UUID> {
    Optional<AuthIdentityEntity> findByProviderAndProviderSubject(AuthProvider provider, String providerSubject);
}
