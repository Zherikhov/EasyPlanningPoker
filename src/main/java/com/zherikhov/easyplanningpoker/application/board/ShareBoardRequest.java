package com.zherikhov.easyplanningpoker.application.board;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ShareBoardRequest(
        @NotBlank @Email String email
) {}
