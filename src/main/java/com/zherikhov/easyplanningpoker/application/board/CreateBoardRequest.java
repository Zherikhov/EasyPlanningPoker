package com.zherikhov.easyplanningpoker.application.board;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 1000) String description
) {}
