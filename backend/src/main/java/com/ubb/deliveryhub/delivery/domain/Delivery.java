package com.ubb.deliveryhub.delivery.domain;

import com.ubb.deliveryhub.delivery.domain.embedded.AddressContact;
import com.ubb.deliveryhub.delivery.domain.id.AddressContactId;
import com.ubb.deliveryhub.delivery.domain.id.DeliveryId;
import com.ubb.deliveryhub.identity.domain.User;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = DeliveryId.TABLE_NAME,
    indexes = {
        @Index(name = DeliveryId.IDX_CUSTOMER_STATUS,
            columnList = DeliveryId.CUSTOMER_ID + "," + DeliveryId.STATUS),
        @Index(name = DeliveryId.IDX_COURIER_STATUS,
            columnList = DeliveryId.COURIER_ID + "," + DeliveryId.STATUS)
    }
)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @Column(name = DeliveryId.TRACKING_CODE, unique = true, length = 64)
    private String trackingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = DeliveryId.CUSTOMER_ID, nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = DeliveryId.COURIER_ID)
    private User courier;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = DeliveryId.STATUS, nullable = false)
    private DeliveryStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = DeliveryId.DELIVERY_TYPE, nullable = false, length = 32)
    private DeliveryType deliveryType;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = AddressContactId.Property.LINE1, column = @Column(name = DeliveryId.PICKUP_LINE1, nullable = false)),
        @AttributeOverride(name = AddressContactId.Property.LINE2, column = @Column(name = DeliveryId.PICKUP_LINE2)),
        @AttributeOverride(name = AddressContactId.Property.CITY, column = @Column(name = DeliveryId.PICKUP_CITY, length = 128)),
        @AttributeOverride(name = AddressContactId.Property.REGION, column = @Column(name = DeliveryId.PICKUP_REGION, length = 128)),
        @AttributeOverride(name = AddressContactId.Property.POSTAL_CODE, column = @Column(name = DeliveryId.PICKUP_POSTAL_CODE, length = 32)),
        @AttributeOverride(name = AddressContactId.Property.COUNTRY, column = @Column(name = DeliveryId.PICKUP_COUNTRY, length = 2)),
        @AttributeOverride(name = AddressContactId.Property.CONTACT_NAME, column = @Column(name = DeliveryId.PICKUP_CONTACT_NAME, nullable = false)),
        @AttributeOverride(name = AddressContactId.Property.CONTACT_PHONE, column = @Column(name = DeliveryId.PICKUP_CONTACT_PHONE, nullable = false, length = 64))
    })
    private AddressContact pickup;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = AddressContactId.Property.LINE1, column = @Column(name = DeliveryId.DESTINATION_LINE1, nullable = false)),
        @AttributeOverride(name = AddressContactId.Property.LINE2, column = @Column(name = DeliveryId.DESTINATION_LINE2)),
        @AttributeOverride(name = AddressContactId.Property.CITY, column = @Column(name = DeliveryId.DESTINATION_CITY, length = 128)),
        @AttributeOverride(name = AddressContactId.Property.REGION, column = @Column(name = DeliveryId.DESTINATION_REGION, length = 128)),
        @AttributeOverride(name = AddressContactId.Property.POSTAL_CODE, column = @Column(name = DeliveryId.DESTINATION_POSTAL_CODE, length = 32)),
        @AttributeOverride(name = AddressContactId.Property.COUNTRY, column = @Column(name = DeliveryId.DESTINATION_COUNTRY, length = 2)),
        @AttributeOverride(name = AddressContactId.Property.CONTACT_NAME, column = @Column(name = DeliveryId.DESTINATION_CONTACT_NAME, nullable = false)),
        @AttributeOverride(name = AddressContactId.Property.CONTACT_PHONE, column = @Column(name = DeliveryId.DESTINATION_CONTACT_PHONE, nullable = false, length = 64))
    })
    private AddressContact destination;

    @Column(name = DeliveryId.PACKAGE_WEIGHT_KG, nullable = false, precision = 12, scale = 4)
    private BigDecimal packageWeightKg;

    @Column(name = DeliveryId.PACKAGE_LENGTH_CM, precision = 12, scale = 2)
    private BigDecimal packageLengthCm;

    @Column(name = DeliveryId.PACKAGE_WIDTH_CM, precision = 12, scale = 2)
    private BigDecimal packageWidthCm;

    @Column(name = DeliveryId.PACKAGE_HEIGHT_CM, precision = 12, scale = 2)
    private BigDecimal packageHeightCm;

    @Column(name = DeliveryId.PACKAGE_DESCRIPTION, length = 1000)
    private String packageDescription;

    @Column(name = DeliveryId.PACKAGE_FRAGILE, nullable = false)
    private boolean packageFragile = false;

    @Column(name = DeliveryId.BASE_AMOUNT, precision = 19, scale = 4)
    private BigDecimal baseAmount;

    @Column(name = DeliveryId.FEE_AMOUNT, precision = 19, scale = 4)
    private BigDecimal feeAmount;

    @Column(name = DeliveryId.TAX_AMOUNT, precision = 19, scale = 4)
    private BigDecimal taxAmount;

    @Column(name = DeliveryId.TOTAL_AMOUNT, precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @Column(name = DeliveryId.CURRENCY, nullable = false, length = 3)
    private String currency = "RON";

    @Column(name = DeliveryId.SPECIAL_INSTRUCTIONS, length = 2000)
    private String specialInstructions;

    @Column(name = DeliveryId.CREATED_AT, nullable = false)
    private Instant createdAt;

    @Column(name = DeliveryId.UPDATED_AT, nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = DeliveryId.VERSION, nullable = false)
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
