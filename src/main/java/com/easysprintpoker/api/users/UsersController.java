package com.easysprintpoker.api.users;

import com.easysprintpoker.domain.entity.AuthSessionEntity;
import com.easysprintpoker.domain.entity.UserEntity;
import com.easysprintpoker.infrastructure.persistence.repository.AuthSessionJpaRepository;
import com.easysprintpoker.infrastructure.persistence.repository.UserJpaRepository;
import com.easysprintpoker.infrastructure.security.AuthUtils;
import com.easysprintpoker.infrastructure.web.errors.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
@RestController
@RequestMapping(path = "/api/v1/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class UsersController {

    private final UserJpaRepository users;
    private final AuthSessionJpaRepository authSessions;

    public UsersController(UserJpaRepository users, AuthSessionJpaRepository authSessions) {
        this.users = users;
        this.authSessions = authSessions;
    }

    @GetMapping("/me")
    public UserProfileResponse me(Authentication auth) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        UserEntity user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        return UserProfileResponse.from(user);
    }

    @GetMapping("/me/sessions")
    public AuthSessionsPageResponse mySessions(Authentication auth,
                                               @RequestParam(name = "page", defaultValue = "0") int page,
                                               @RequestParam(name = "size", defaultValue = "20") int size) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        if (size > 100) size = 100;
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<AuthSessionEntity> p = authSessions.findByUser_Id(userId, pageable);
        List<AuthSessionResponse> items = p.getContent().stream().map(AuthSessionResponse::from).toList();
        return new AuthSessionsPageResponse(p.getNumber(), p.getSize(), p.getTotalElements(), items);
    }

    @PatchMapping("/me/locale")
    public UserProfileResponse updateLocale(Authentication auth, @RequestBody UpdateLocaleRequest request) {
        UUID userId = AuthUtils.getUserId(auth);
        if (userId == null) throw new NotFoundException("User not found");
        UserEntity user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        user.setDefaultLocale(request.locale());
        users.save(user);
        return UserProfileResponse.from(user);
    }

    public record UpdateLocaleRequest(String locale) {}

    public record UserProfileResponse(
            UUID id,
            String email,
            String displayName,
            String avatarUrl,
            String defaultLocale,
            String timezone,
            OffsetDateTime createdAt,
            OffsetDateTime lastLoginAt,
            String status
    ) {
        public static UserProfileResponse from(UserEntity u) {
            return new UserProfileResponse(
                    u.getId(),
                    u.getEmail(),
                    u.getDisplayName(),
                    u.getAvatarUrl(),
                    u.getDefaultLocale(),
                    u.getTimezone(),
                    u.getCreatedAt(),
                    u.getLastLoginAt(),
                    u.getStatus().name()
            );
        }
    }

    public record AuthSessionsPageResponse(int page, int size, long total, List<AuthSessionResponse> items) {}

    public record AuthSessionResponse(
            UUID id,
            OffsetDateTime createdAt,
            OffsetDateTime expiresAt,
            OffsetDateTime revokedAt,
            String ip,
            String userAgent,
            String deviceName
    ) {
        public static AuthSessionResponse from(AuthSessionEntity e) {
            return new AuthSessionResponse(
                    e.getId(),
                    e.getCreatedAt(),
                    e.getExpiresAt(),
                    e.getRevokedAt(),
                    e.getIp(),
                    e.getUserAgent(),
                    e.getDeviceName()
            );
        }
    }
}
