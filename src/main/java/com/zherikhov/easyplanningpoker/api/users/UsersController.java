package com.zherikhov.easyplanningpoker.api.users;

import com.zherikhov.easyplanningpoker.application.users.CurrentUserResponse;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.User;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.UserProfile;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserProfilesService;
import com.zherikhov.easyplanningpoker.infrastructure.persistence.service.UserService;
import com.zherikhov.easyplanningpoker.infrastructure.security.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Slf4j
public class UsersController {

    private final JwtProvider jwtProvider;
    private final UserService userService;
    private final UserProfilesService userProfilesService;

    public UsersController(JwtProvider jwtProvider, UserService userService, UserProfilesService userProfilesService) {
        this.jwtProvider = jwtProvider;
        this.userService = userService;
        this.userProfilesService = userProfilesService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("/api/users/me unauthorized: missing Authorization header");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Missing Authorization header"));
        }
        String token = authHeader.substring(7);
        final UUID userId;
        try {
            userId = UUID.fromString(jwtProvider.getSubject(token));
        } catch (Exception e) {
            log.warn("/api/users/me unauthorized: invalid token: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "Invalid token"));
        }

        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            log.warn("/api/users/me unauthorized: user not found: {}", userId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("UNAUTHORIZED", "User not found"));
        }
        User user = userOpt.get();
        Optional<UserProfile> profileOpt = userProfilesService.findByUserId(user.getId());
        UserProfile profile = profileOpt.orElse(null);

        CurrentUserResponse dto = CurrentUserResponse.from(user, profile);
        log.info("/api/users/me success: userId={}", user.getId());
        return ResponseEntity.ok(dto);
    }

    private static java.util.Map<String, String> error(String code, String message) {
        return java.util.Map.of("error", code, "message", message);
    }
}
