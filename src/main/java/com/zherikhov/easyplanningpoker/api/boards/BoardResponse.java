package com.zherikhov.easyplanningpoker.api.boards;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;

import java.time.Instant;
import java.util.UUID;

public record BoardResponse(UUID id, String name, String description, Instant createdAt) {
    public static BoardResponse from(Board b) {
        return new BoardResponse(b.getId(), b.getName(), b.getDescription(), b.getCreatedAt());
    }
}
