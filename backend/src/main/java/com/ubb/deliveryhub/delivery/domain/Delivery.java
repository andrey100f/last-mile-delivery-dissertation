package com.ubb.deliveryhub.delivery.domain;

import com.ubb.deliveryhub.delivery.domain.embedded.AddressContact;
import com.ubb.deliveryhub.identity.domain.User;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "deliveries",
    indexes = {
        @Index(name = "idx_deliveries_customer_status", columnList = "customer_id,status"),
        @Index(name = "idx_deliveries_courier_status", columnList = "courier_id,status")
    }
)
@Data
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tracking_code", unique = true, length = 64)
    private String trackingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "courier_id")
    private User courier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DeliveryStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", nullable = false, length = 32)
    private DeliveryType deliveryType;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "line1", column = @Column(name = "pickup_line1", nullable = false)),
        @AttributeOverride(name = "line2", column = @Column(name = "pickup_line2")),
        @AttributeOverride(name = "city", column = @Column(name = "pickup_city", nullable = false)),
        @AttributeOverride(name = "region", column = @Column(name = "pickup_region")),
        @AttributeOverride(name = "postalCode", column = @Column(name = "pickup_postal_code", nullable = false)),
        @AttributeOverride(name = "country", column = @Column(name = "pickup_country", nullable = false, length = 2)),
        @AttributeOverride(name = "contactName", column = @Column(name = "pickup_contact_name", nullable = false)),
        @AttributeOverride(name = "contactPhone", column = @Column(name = "pickup_contact_phone", nullable = false))
    })
    private AddressContact pickup;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "line1", column = @Column(name = "destination_line1", nullable = false)),
        @AttributeOverride(name = "line2", column = @Column(name = "destination_line2")),
        @AttributeOverride(name = "city", column = @Column(name = "destination_city", nullable = false)),
        @AttributeOverride(name = "region", column = @Column(name = "destination_region")),
        @AttributeOverride(name = "postalCode", column = @Column(name = "destination_postal_code", nullable = false)),
        @AttributeOverride(name = "country", column = @Column(name = "destination_country", nullable = false, length = 2)),
        @AttributeOverride(name = "contactName", column = @Column(name = "destination_contact_name", nullable = false)),
        @AttributeOverride(name = "contactPhone", column = @Column(name = "destination_contact_phone", nullable = false))
    })
    private AddressContact destination;

    @Column(name = "package_weight_kg", nullable = false, precision = 12, scale = 4)
    private BigDecimal packageWeightKg;

    @Column(name = "package_length_cm", precision = 12, scale = 2)
    private BigDecimal packageLengthCm;

    @Column(name = "package_width_cm", precision = 12, scale = 2)
    private BigDecimal packageWidthCm;

    @Column(name = "package_height_cm", precision = 12, scale = 2)
    private BigDecimal packageHeightCm;

    @Column(name = "package_description", length = 1000)
    private String packageDescription;

    @Column(name = "package_fragile", nullable = false)
    private boolean packageFragile = false;

    @Column(name = "base_amount", precision = 19, scale = 4)
    private BigDecimal baseAmount;

    @Column(name = "fee_amount", precision = 19, scale = 4)
    private BigDecimal feeAmount;

    @Column(name = "tax_amount", precision = 19, scale = 4)
    private BigDecimal taxAmount;

    @Column(name = "total_amount", precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency = "RON";

    @Column(name = "special_instructions", length = 2000)
    private String specialInstructions;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    private void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    private void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
