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
@Table(name = "vote_events")
public class VoteEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(name = "session_participant_id", nullable = false)
    private UUID sessionParticipantId;

    @Column(name = "value_label")
    private String valueLabel;

    @Column(name = "numeric_value")
    private BigDecimal numericValue;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now().withNano(0);
    }
}
