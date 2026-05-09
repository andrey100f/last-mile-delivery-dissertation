package com.ubb.deliveryhub.courier.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class CourierProfileResponse {
    String displayName;
    String phone;
    VehicleDto vehicle;
    AvailabilityDto availability;

    @Value
    @Builder
    public static class VehicleDto {
        String type;
        String plate;
        BigDecimal capacityKg;
        BigDecimal capacityLiters;
    }

    @Value
    @Builder
    public static class AvailabilityDto {
        boolean availableNow;
        List<AvailabilitySlotDto> weeklySchedule;
        BigDecimal maxDistanceKm;
        boolean expressCapable;
    }
}
