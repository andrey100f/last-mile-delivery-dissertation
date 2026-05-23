package com.ubb.deliveryhub.admin.integration.courier.domain;

import com.ubb.deliveryhub.admin.integration.courier.domain.id.CourierAvailabilitySlotId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = CourierAvailabilitySlotId.TABLE_NAME)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class CourierAvailabilitySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = CourierAvailabilitySlotId.COURIER_PROFILE_ID, nullable = false)
    private CourierProfile courierProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = CourierAvailabilitySlotId.DAY_OF_WEEK, nullable = false, length = 16)
    private DayOfWeek dayOfWeek;

    @Column(name = CourierAvailabilitySlotId.START_TIME, nullable = false)
    private LocalTime startTime;

    @Column(name = CourierAvailabilitySlotId.END_TIME, nullable = false)
    private LocalTime endTime;
}
