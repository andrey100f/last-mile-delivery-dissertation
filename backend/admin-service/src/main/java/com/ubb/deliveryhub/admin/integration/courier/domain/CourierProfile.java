package com.ubb.deliveryhub.admin.integration.courier.domain;

import com.ubb.deliveryhub.admin.integration.courier.domain.id.CourierProfileId;
import com.ubb.deliveryhub.common.domain.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = CourierProfileId.TABLE_NAME)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class CourierProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = CourierProfileId.USER_ID, nullable = false, unique = true)
    private User user;

    @Column(name = CourierProfileId.DISPLAY_NAME, nullable = false)
    private String displayName;

    @Column(name = CourierProfileId.PHONE, length = 64)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = CourierProfileId.VEHICLE_TYPE, length = 32)
    private VehicleType vehicleType;

    @Column(name = CourierProfileId.VEHICLE_PLATE, length = 32)
    private String vehiclePlate;

    @Column(name = CourierProfileId.VEHICLE_CAPACITY_KG, precision = 10, scale = 2)
    private BigDecimal vehicleCapacityKg;

    @Column(name = CourierProfileId.VEHICLE_CAPACITY_LITERS, precision = 10, scale = 2)
    private BigDecimal vehicleCapacityLiters;

    @Column(name = CourierProfileId.AVAILABLE_NOW, nullable = false)
    private boolean availableNow;

    @Column(name = CourierProfileId.MAX_DISTANCE_KM, precision = 10, scale = 2)
    private BigDecimal maxDistanceKm;

    @Column(name = CourierProfileId.EXPRESS_CAPABLE, nullable = false)
    private boolean expressCapable;

    @Column(name = CourierProfileId.CREATED_AT, nullable = false)
    private Instant createdAt;

    @Column(name = CourierProfileId.UPDATED_AT, nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = CourierProfileId.VERSION, nullable = false)
    private Long version;

    @OneToMany(
        mappedBy = "courierProfile",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<CourierAvailabilitySlot> availabilitySlots = new ArrayList<>();

    @jakarta.persistence.PrePersist
    private void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    private void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
