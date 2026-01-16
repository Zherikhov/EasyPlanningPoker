package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.BillingProvider;
import com.easysprintpoker.domain.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "subscriptions",
        uniqueConstraints = {
                // Полная уникальность provider_subscription_id невозможна как partial в Entity, добавим обычный UNIQUE
                @UniqueConstraint(name = "uq_subscriptions_provider_subscription_id", columnNames = {"provider_subscription_id"})
        })
public class SubscriptionEntity {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private BillingPlanEntity plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private BillingProvider provider;

    @Column(name = "provider_subscription_id")
    private String providerSubscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SubscriptionStatus status = SubscriptionStatus.TRIALING;

    @Column(name = "current_period_start", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime currentPeriodStart;

    @Column(name = "current_period_end", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime currentPeriodEnd;

    @Column(name = "cancel_at_period_end", nullable = false)
    private boolean cancelAtPeriodEnd = false;

    @Column(name = "canceled_at", columnDefinition = "timestamptz")
    private OffsetDateTime canceledAt;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now().withNano(0);
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now().withNano(0);
    }
}
