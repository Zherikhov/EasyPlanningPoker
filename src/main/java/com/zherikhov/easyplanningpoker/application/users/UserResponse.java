package com.zherikhov.easyplanningpoker.application.users;

import java.util.UUID;

public record UserResponse(UUID id, String email, String displayName) {}
