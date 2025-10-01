package com.zherikhov.easyplanningpoker.application.board;

import com.zherikhov.easyplanningpoker.infrastructure.persistence.entity.Board;

import java.time.Instant;
import java.util.UUID;

public record BoardResponse(UUID id, String name, String description, Instant createdAt, boolean shared) {
    public static BoardResponse from(Board b) {
        return new BoardResponse(b.getId(), b.getName(), b.getDescription(), b.getCreatedAt(), false);
    }

    public static BoardResponse shared(Board b) {
        return new BoardResponse(b.getId(), b.getName(), b.getDescription(), b.getCreatedAt(), true);
    }
}
