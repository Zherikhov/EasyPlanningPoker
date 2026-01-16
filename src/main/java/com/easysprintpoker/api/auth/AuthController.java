package com.easysprintpoker.api.auth;

import com.easysprintpoker.domain.entity.UserEntity;
import com.easysprintpoker.infrastructure.persistence.repository.UserJpaRepository;
import com.easysprintpoker.infrastructure.security.JwtService;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping(path = "/api/v1/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final UserJpaRepository users;
    private final JwtService jwtService;

    public AuthController(UserJpaRepository users, JwtService jwtService) {
        this.users = users;
        this.jwtService = jwtService;
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterRequest(@NotBlank String name, @Email @NotBlank String email, @NotBlank String password) {}
    public record UserDto(UUID id, String email, String displayName) {
        public static UserDto from(UserEntity u) {
            return new UserDto(u.getId(), u.getEmail(), u.getDisplayName());
        }
    }
    public record AuthResponse(String token, UserDto user) {}

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional(readOnly = true)
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        String norm = normalizeEmail(req.email());
        Optional<UserEntity> opt = users.findAll().stream()
                .filter(u -> norm.equals(u.getEmailNormalized()))
                .findFirst();
        UserEntity user = opt.orElseThrow(() -> new NotFoundException("User not found"));
        String hash = sha256(req.password());
        if (user.getPasswordHash() == null || !user.getPasswordHash().equals(hash)) {
            throw new ForbiddenException("Invalid credentials");
        }
        String token = jwtService.generate(user.getId().toString(), 24 * 60 * 60);
        return new AuthResponse(token, UserDto.from(user));
    }

    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        String norm = normalizeEmail(req.email());
        boolean exists = users.findAll().stream().anyMatch(u -> norm.equals(u.getEmailNormalized()));
        if (exists) {
            throw new ForbiddenException("Email already registered");
        }
        UserEntity user = new UserEntity();
        user.setEmail(req.email());
        user.setDisplayName(req.name());
        user.setPasswordHash(sha256(req.password()));
        user.setCreatedAt(OffsetDateTime.now().withNano(0));
        user.setUpdatedAt(OffsetDateTime.now().withNano(0));
        users.save(user);

        String token = jwtService.generate(user.getId().toString(), 24 * 60 * 60);
        return new AuthResponse(token, UserDto.from(user));
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
