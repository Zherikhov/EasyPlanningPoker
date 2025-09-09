package com.zherikhov.easyplanningpoker.application.auth;


import com.zherikhov.easyplanningpoker.application.UserResponse;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.dao.UserJpaRepository;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final JwtProvider jwtProvider;
    private final UserJpaRepository repository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthServiceImpl(JwtProvider jwtProvider, UserJpaRepository repository) {
        this.jwtProvider = jwtProvider;
        this.repository = repository;
    }

    @Override
    public Optional<AuthResponse> login(AuthRequest request) {
        String email = request.email().trim().toLowerCase();
        Optional<User> userOpt = repository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        User user = userOpt.get();
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            return Optional.empty();
        }
        String token = jwtProvider.generateToken(String.valueOf(user.getId()));
        UserResponse userResponse = new UserResponse(UUID.fromString(String.valueOf(user.getId())), user.getEmail(), "user.getDisplayName()");
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
}
