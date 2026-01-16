package com.easysprintpoker.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "session_scale_items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_session_scale_items_label", columnNames = {"session_id", "label"})
        })
public class SessionScaleItemEntity {

    @EmbeddedId
    private SessionScaleItemId id;

    @MapsId("sessionId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EstimationSessionEntity session;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "numeric_value")
    private BigDecimal numericValue;

    @Column(name = "special", nullable = false)
    private boolean special = false;
}
