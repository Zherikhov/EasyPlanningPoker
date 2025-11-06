package com.zherikhov.easyplanningpoker.api.auth;

import com.zherikhov.easyplanningpoker.application.auth.AuthRequest;
import com.zherikhov.easyplanningpoker.application.auth.AuthService;
import com.zherikhov.easyplanningpoker.application.registration.RegisterRequest;
import com.zherikhov.easyplanningpoker.application.registration.RegistrationService;
import com.zherikhov.easyplanningpoker.application.users.UserResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {

    private final RegistrationService registrationService;
    private final AuthService authService;

    public AuthController(RegistrationService registrationService, AuthService authService) {
        this.registrationService = registrationService;
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {

        log.info("Registering user: {}", request.email());
        try {
            UserResponse response = registrationService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            log.error("Registration failed: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "error", "EMAIL_TAKEN",
                            "message", ex.getMessage()
                    ));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request)
                .<ResponseEntity<?>>map(response -> {
                    log.info("Login successful: {}" , request.email());
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    log.warn("Login failed: invalid credentials: {}", request.email());
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of(
                                    "error", "INVALID_CREDENTIALS",
                                    "message", "Неверный email или пароль"
                            ));
                });

    }
}
