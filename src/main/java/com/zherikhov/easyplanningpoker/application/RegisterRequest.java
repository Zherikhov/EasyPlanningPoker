package com.zherikhov.easyplanningpoker.application;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank @Size(min = 2, max = 60) String displayName
) {}
