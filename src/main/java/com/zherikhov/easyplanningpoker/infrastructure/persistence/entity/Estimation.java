package com.zherikhov.easyplanningpoker.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "estimations")
@IdClass(Estimation.EstimationId.class)
public class Estimation {

    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private PlanningSession session;

    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "value", length = 10)
    private String value;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Getter
    @Setter
    public static class EstimationId implements Serializable {
        private UUID session;
        private UUID user;

        public EstimationId() {}
    }
}
