package com.zherikhov.easyplanningpoker.application.auth;


import com.zherikhov.easyplanningpoker.application.UserResponse;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.UserJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

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
        String token = jwtProvider.generateToken(String.valueOf(user.getId()));
        UserResponse userResponse = new UserResponse(user.getId(), user.getEmail(), user.getUsername());
        return Optional.of(new AuthResponse(token, 3600, userResponse));
    }

//    @Override
//    public Optional<Map<String, Object>> refresh(String refreshToken) {
//        if (refreshToken == null) {
//            return Optional.empty();
//        }
//        try {
//            String userId = jwtProvider.getSubject(refreshToken);
//            String token = jwtProvider.generateToken(userId);
//            return Optional.of(Map.of("accessToken", token, "expiresIn", 3600));
//        } catch (Exception e) {
//            return Optional.empty();
//        }
//    }

//    @Override
//    public Optional<UserResponse> me(String authHeader) {
//        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
//            return Optional.empty();
//        }
//        String token = authHeader.substring(7);
//        try {
//            String userId = jwtProvider.getSubject(token);
//            return repository.findById(userId)
//                    .map(u -> new UserResponse(UUID.fromString(u.getId()), u.getEmail(), u.getDisplayName()));
//        } catch (Exception e) {
//            return Optional.empty();
//        }
//    }

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
