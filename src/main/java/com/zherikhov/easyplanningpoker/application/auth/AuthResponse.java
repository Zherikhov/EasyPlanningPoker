package com.zherikhov.easyplanningpoker.application.auth;

import com.zherikhov.easyplanningpoker.application.users.UserResponse;

public record AuthResponse(String accessToken, int expiresIn, UserResponse user) {}
