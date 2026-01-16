package com.easysprintpoker.domain.entity;

import com.easysprintpoker.domain.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "subscription_invoices",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_subscription_invoices_provider_invoice_id", columnNames = {"provider_invoice_id"})
        })
public class SubscriptionInvoiceEntity {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subscription_id", nullable = false)
    private SubscriptionEntity subscription;

    @Column(name = "provider_invoice_id")
    private String providerInvoiceId;

    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    @Column(name = "currency", nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvoiceStatus status = InvoiceStatus.OPEN;

    @Column(name = "issued_at", nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime issuedAt;

    @Column(name = "paid_at", columnDefinition = "timestamptz")
    private OffsetDateTime paidAt;

    @Column(name = "raw", columnDefinition = "text")
    private String raw; // jsonb
}
