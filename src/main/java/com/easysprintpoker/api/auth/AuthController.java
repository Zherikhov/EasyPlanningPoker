package com.easysprintpoker.api.auth;

import com.easysprintpoker.domain.entity.AuthSessionEntity;
import com.easysprintpoker.domain.entity.UserEntity;
import com.easysprintpoker.infrastructure.persistence.repository.AuthSessionJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.UserJpaRepository;
import com.easysprintpoker.infrastructure.security.JwtService;
import com.easysprintpoker.infrastructure.web.errors.ForbiddenException;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping(path = "/api/v1/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final UserJpaRepository users;
    private final JwtService jwtService;
    private final AuthSessionJpaRepository sessions;
    private final PasswordEncoder passwordEncoder;
    private final long accessTtlSeconds;
    private final long refreshTtlDays;
    private final String refreshCookieName;
    private final boolean cookieSecure;

    public AuthController(UserJpaRepository users,
                          JwtService jwtService,
                          AuthSessionJpaRepository sessions,
                          PasswordEncoder passwordEncoder,
                          @Value("${security.jwt.access-ttl-seconds:900}") long accessTtlSeconds,
                          @Value("${security.jwt.refresh-ttl-days:30}") long refreshTtlDays,
                          @Value("${security.jwt.refresh-cookie-name:pp-refresh}") String refreshCookieName,
                          @Value("${security.cookie.secure:false}") boolean cookieSecure) {
        this.users = users;
        this.jwtService = jwtService;
        this.sessions = sessions;
        this.passwordEncoder = passwordEncoder;
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlDays = refreshTtlDays;
        this.refreshCookieName = refreshCookieName;
        this.cookieSecure = cookieSecure;
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
    @Transactional
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        String norm = normalizeEmail(req.email());
        Optional<UserEntity> opt = users.findAll().stream()
                .filter(u -> norm.equals(u.getEmailNormalized()))
                .findFirst();
        UserEntity user = opt.orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ForbiddenException("Invalid credentials");
        }
        user.setLastLoginAt(OffsetDateTime.now().withNano(0));
        users.save(user);

        String access = jwtService.generate(user.getId().toString(), accessTtlSeconds);
        issueRefreshSessionAndCookie(user, request, response);
        return new AuthResponse(access, UserDto.from(user));
    }

    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request, HttpServletResponse response) {
        String norm = normalizeEmail(req.email());
        boolean exists = users.findAll().stream().anyMatch(u -> norm.equals(u.getEmailNormalized()));
        if (exists) {
            throw new ForbiddenException("Email already registered");
        }
        UserEntity user = new UserEntity();
        user.setEmail(req.email());
        user.setDisplayName(req.name());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setCreatedAt(OffsetDateTime.now().withNano(0));
        user.setUpdatedAt(OffsetDateTime.now().withNano(0));
        users.save(user);

        String access = jwtService.generate(user.getId().toString(), accessTtlSeconds);
        issueRefreshSessionAndCookie(user, request, response);
        return new AuthResponse(access, UserDto.from(user));
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    // region refresh/logout
    public record RefreshResponse(String token) {}

    @PostMapping(path = "/refresh")
    @Transactional(readOnly = true)
    public RefreshResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String refresh = readRefreshCookie(request);
        if (refresh == null || refresh.isBlank()) {
            throw new ForbiddenException("No refresh token");
        }
        String hash = sha256(refresh);
        AuthSessionEntity session = sessions.findByRefreshTokenHash(hash).orElseThrow(() -> new ForbiddenException("Invalid refresh token"));
        if (session.getRevokedAt() != null) throw new ForbiddenException("Refresh revoked");
        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(OffsetDateTime.now().withNano(0))) {
            throw new ForbiddenException("Refresh expired");
        }
        UserEntity user = session.getUser();
        String access = jwtService.generate(user.getId().toString(), accessTtlSeconds);
        // optional rotation could be added later
        return new RefreshResponse(access);
    }

    @PostMapping(path = "/logout")
    @Transactional
    public Map<String, Object> logout(Authentication auth, HttpServletRequest request, HttpServletResponse response) {
        String refresh = readRefreshCookie(request);
        if (refresh != null && !refresh.isBlank()) {
            String hash = sha256(refresh);
            sessions.findByRefreshTokenHash(hash).ifPresent(s -> {
                if (s.getRevokedAt() == null) s.setRevokedAt(OffsetDateTime.now().withNano(0));
                sessions.save(s);
            });
        }
        // clear cookie
        Cookie cookie = new Cookie(refreshCookieName, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        response.addHeader("Set-Cookie", refreshCookieName + "=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax" + (cookieSecure ? "; Secure" : ""));
        return Map.of("status", "ok");
    }
    // endregion

    private void issueRefreshSessionAndCookie(UserEntity user, HttpServletRequest request, HttpServletResponse response) {
        String refresh = generateRandom256bit();
        String hash = sha256(refresh);
        AuthSessionEntity s = new AuthSessionEntity();
        s.setUser(user);
        s.setRefreshTokenHash(hash);
        s.setCreatedAt(OffsetDateTime.now().withNano(0));
        s.setExpiresAt(OffsetDateTime.now().withNano(0).plus(refreshTtlDays, ChronoUnit.DAYS));
        s.setIp(getClientIp(request));
        s.setUserAgent(Optional.ofNullable(request.getHeader("User-Agent")).orElse(""));
        sessions.save(s);

        Cookie cookie = new Cookie(refreshCookieName, refresh);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) (refreshTtlDays * 24 * 60 * 60));
        response.addCookie(cookie);
        response.addHeader("Set-Cookie", refreshCookieName + "=" + refresh + "; Path=/; HttpOnly; Max-Age=" + cookie.getMaxAge() + "; SameSite=Lax" + (cookieSecure ? "; Secure" : ""));
    }

    private String readRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (refreshCookieName.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private static String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private static String generateRandom256bit() {
        byte[] b = new byte[32];
        new SecureRandom().nextBytes(b);
        return HexFormat.of().formatHex(b);
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
