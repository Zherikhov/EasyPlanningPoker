package com.easysprintpoker.infrastructure.security;

import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.UUID;

public final class AuthUtils {
    private AuthUtils() {}

    public static UUID getUserId(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal == null) return null;
        if (principal instanceof Map<?,?> map) {
            Object val = map.get("userId");
            if (val != null) {
                try { return UUID.fromString(val.toString()); } catch (Exception ignore) {}
            }
        }
        return null;
    }
}
