package com.easysprintpoker.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "votes")
public class VoteEntity {

    @EmbeddedId
    private VoteId id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId; // denormalized

    @Column(name = "value_label", nullable = false)
    private String valueLabel;

    @Column(name = "numeric_value")
    private BigDecimal numericValue;

    @Column(name = "voted_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime votedAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now().withNano(0);
        if (votedAt == null) votedAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now().withNano(0);
    }
}
