package com.zherikhov.easyplanningpoker.application.auth;

import java.util.Optional;

public interface AuthService {
    Optional<AuthResponse> login(AuthRequest request);
}
