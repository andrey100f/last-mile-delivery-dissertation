package com.ubb.deliveryhub.courier.api.dto;

import com.ubb.deliveryhub.courier.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Data
public class UpdateCourierProfileRequest {

    @NotNull
    @Valid
    private PersonalInfoDto personalInfo;

    @NotNull
    @Valid
    private VehicleDto vehicle;

    @NotNull
    @Valid
    private AvailabilityDto availability;

    @AssertTrue(message = "availability.weeklySchedule contains invalid time ranges")
    public boolean hasValidSlotRanges() {
        if (availability == null || availability.getWeeklySchedule() == null) {
            return true;
        }
        for (AvailabilitySlotDto slot : availability.getWeeklySchedule()) {
            if (slot == null || slot.getStart() == null || slot.getEnd() == null) {
                continue;
            }
            if (!slot.getStart().isBefore(slot.getEnd())) {
                return false;
            }
        }
        return true;
    }

    @AssertTrue(message = "availability.weeklySchedule contains overlapping intervals")
    public boolean hasNoOverlappingSlots() {
        if (availability == null || availability.getWeeklySchedule() == null) {
            return true;
        }
        Map<DayOfWeek, List<AvailabilitySlotDto>> byDay = availability.getWeeklySchedule().stream()
            .filter(slot -> slot != null && slot.getDayOfWeek() != null && slot.getStart() != null && slot.getEnd() != null)
            .collect(Collectors.groupingBy(AvailabilitySlotDto::getDayOfWeek));

        for (List<AvailabilitySlotDto> daySlots : byDay.values()) {
            List<AvailabilitySlotDto> sorted = new ArrayList<>(daySlots);
            sorted.sort(Comparator.comparing(AvailabilitySlotDto::getStart));
            LocalTime previousEnd = null;
            for (AvailabilitySlotDto slot : sorted) {
                if (previousEnd != null && slot.getStart().isBefore(previousEnd)) {
                    return false;
                }
                previousEnd = slot.getEnd();
            }
        }
        return true;
    }

    @AssertTrue(message = "vehicle.type, vehicle.plate and vehicle.capacityKg are required when availability.availableNow is true")
    public boolean hasRequiredVehicleWhenAvailableNow() {
        if (availability == null || !availability.isAvailableNow()) {
            return true;
        }
        if (vehicle == null) {
            return false;
        }
        return vehicle.getType() != null
            && vehicle.getPlate() != null
            && !vehicle.getPlate().isBlank()
            && vehicle.getCapacityKg() != null;
    }

    @Data
    public static class PersonalInfoDto {

        @NotBlank
        @Size(max = 255)
        private String displayName;

        @Size(max = 64)
        private String phone;
    }

    @Data
    public static class VehicleDto {

        private VehicleType type;

        @Size(max = 32)
        private String plate;

        @DecimalMin(value = "0.0")
        @DecimalMax(value = "10000.0")
        private BigDecimal capacityKg;

        @DecimalMin(value = "0.0")
        @DecimalMax(value = "10000.0")
        private BigDecimal capacityLiters;
    }

    @Data
    public static class AvailabilityDto {

        private boolean availableNow;

        @NotNull
        @Valid
        private List<AvailabilitySlotDto> weeklySchedule = new ArrayList<>();

        @DecimalMin(value = "0.0")
        @DecimalMax(value = "500.0")
        private BigDecimal maxDistanceKm;

        private boolean expressCapable;
    }
}
