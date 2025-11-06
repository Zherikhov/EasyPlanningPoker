package com.zherikhov.easyplanningpoker.application.auth;


import com.zherikhov.easyplanningpoker.application.users.UserResponse;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.UserJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private static final long REMEMBER_ME_TTL_MS = 30L * 24 * 60 * 60 * 1000; // 30 days

    private final JwtProvider jwtProvider;
    private final UserJpaRepository repository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(JwtProvider jwtProvider, UserJpaRepository repository, PasswordEncoder passwordEncoder) {
        this.jwtProvider = jwtProvider;
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Optional<AuthResponse> login(AuthRequest request) {
        String email = request.email().trim().toLowerCase();
        Optional<User> userOpt = repository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        User user = userOpt.get();
        if (!matchesPassword(request.password(), user.getPasswordHash())) {
            return Optional.empty();
        }

        boolean remember = request.rememberMe();
        long ttlMs = remember ? REMEMBER_ME_TTL_MS : jwtProvider.getExpirationMillis();
        String token;
        int expiresInSeconds;
        if (ttlMs > 0) {
            token = jwtProvider.generateTokenWithTtl(String.valueOf(user.getId()), ttlMs);
            expiresInSeconds = (int) Math.min(Integer.MAX_VALUE, ttlMs / 1000);
        } else {
            token = jwtProvider.generateToken(String.valueOf(user.getId()));
            expiresInSeconds = 0; // non-expiring or unknown
        }

        UserResponse userResponse = new UserResponse(user.getId(), user.getEmail(), user.getUsername());
        return Optional.of(new AuthResponse(token, expiresInSeconds, userResponse));
    }

    private boolean matchesPassword(String rawPassword, String storedHash) {
        if (storedHash == null) return false;
        String trimmed = storedHash.trim();
        // If stored as BCrypt
        if (trimmed.startsWith("$2a$") || trimmed.startsWith("$2b$") || trimmed.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, trimmed);
        }
        // Legacy SHA-256 hex fallback (64 hex chars)
        if (trimmed.matches("(?i)^[0-9a-f]{64}$")) {
            try {
                java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
                byte[] hash = digest.digest(rawPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                for (byte b : hash) sb.append(String.format("%02x", b));
                return sb.toString().equalsIgnoreCase(trimmed);
            } catch (java.security.NoSuchAlgorithmException e) {
                return false;
            }
        }
        return false;
    }
}
