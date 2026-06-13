package com.easysprintpoker.infrastructure.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AuthUtilsTest {

    @Test
    void returnsNullWhenAuthenticationIsNull() {
        assertNull(AuthUtils.getUserId(null));
    }

    @Test
    void returnsNullWhenPrincipalIsNotAMap() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("user", "credentials");

        assertNull(AuthUtils.getUserId(authentication));
    }

    @Test
    void returnsNullWhenMapHasNoUserId() {
        Authentication authentication = new UsernamePasswordAuthenticationToken(Map.of("email", "user@example.com"), null);

        assertNull(AuthUtils.getUserId(authentication));
    }

    @Test
    void returnsNullWhenUserIdIsNotAValidUuid() {
        Authentication authentication = new UsernamePasswordAuthenticationToken(Map.of("userId", "not-a-uuid"), null);

        assertNull(AuthUtils.getUserId(authentication));
    }

    @Test
    void returnsUuidWhenPrincipalMapContainsValidUserId() {
        UUID userId = UUID.randomUUID();
        Authentication authentication = new UsernamePasswordAuthenticationToken(Map.of("userId", userId.toString()), null);

        assertEquals(userId, AuthUtils.getUserId(authentication));
    }
}
