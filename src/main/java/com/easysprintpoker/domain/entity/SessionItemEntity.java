package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.ItemStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "session_items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_session_items_position", columnNames = {"session_id", "position"})
        })
public class SessionItemEntity {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EstimationSessionEntity session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    @Column(name = "external_key")
    private String externalKey;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "position", nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ItemStatus status = ItemStatus.PENDING;

    @Column(name = "revealed_at", columnDefinition = "timestamptz")
    private OffsetDateTime revealedAt;

    @Column(name = "final_label")
    private String finalLabel;

    @Column(name = "final_numeric")
    private BigDecimal finalNumeric;

    @Column(name = "finalized_at", columnDefinition = "timestamptz")
    private OffsetDateTime finalizedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finalized_by")
    private UserEntity finalizedBy;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now().withNano(0);
    }
}
