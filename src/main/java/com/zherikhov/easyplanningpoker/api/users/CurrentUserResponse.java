package com.zherikhov.easyplanningpoker.api.users;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;

import java.time.Instant;
import java.util.UUID;

public record CurrentUserResponse(
        UUID id,
        String username,
        String email,
        String role,
        Instant createdAt,
        Instant updatedAt,
        UUID profileId,
        String displayName,
        String avatarUrl,
        String bio,
        Instant lastLogin
) {
    public static CurrentUserResponse from(User user, UserProfile profile) {
        return new CurrentUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                profile != null ? profile.getId() : null,
                profile != null ? profile.getDisplayName() : null,
                profile != null ? profile.getAvatarUrl() : null,
                profile != null ? profile.getBio() : null,
                profile != null ? profile.getLastLogin() : null
        );
    }
}
