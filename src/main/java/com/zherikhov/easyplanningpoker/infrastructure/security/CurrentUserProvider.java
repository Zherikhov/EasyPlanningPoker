package com.zherikhov.easyplanningpoker.infrastructure.security;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Provides a consistent way to resolve the current authenticated User,
 * using data stored in Spring SecurityContext.
 * This avoids duplication across controllers and keeps behavior uniform.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserService userService;

    /**
     * Attempts to resolve the current authenticated user from the SecurityContext.
     * Returns Optional.empty() when not authenticated or resolution fails.
     */
    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.debug("No authenticated principal in context");
            return Optional.empty();
        }

        Object principal = auth.getPrincipal();
        try {
            String idStr;
            if (principal instanceof org.springframework.security.core.userdetails.User u) {
                idStr = u.getUsername();
            } else if (principal instanceof String s) {
                idStr = s;
            } else {
                log.debug("Unsupported principal type: {}", principal.getClass().getName());
                return Optional.empty();
            }
            UUID userId = UUID.fromString(idStr);
            return userService.findById(userId);
        } catch (Exception e) {
            log.debug("Failed to resolve current user from principal: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
