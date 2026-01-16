package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.BillingProvider;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "billing_customers",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_billing_customers_provider_customer", columnNames = {"provider", "provider_customer_id"})
        })
public class BillingCustomerEntity {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID id; // shared PK with user

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private BillingProvider provider;

    @Column(name = "provider_customer_id", nullable = false)
    private String providerCustomerId;

    @Column(name = "created_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now().withNano(0);
    }
}
