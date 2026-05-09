package com.ubb.deliveryhub.courier.service;

import com.ubb.deliveryhub.courier.api.dto.AvailabilitySlotDto;
import com.ubb.deliveryhub.courier.api.dto.CourierProfileResponse;
import com.ubb.deliveryhub.courier.api.dto.UpdateCourierProfileRequest;
import com.ubb.deliveryhub.courier.domain.CourierAvailabilitySlot;
import com.ubb.deliveryhub.courier.domain.CourierProfile;

import java.util.Comparator;
import java.util.List;

public final class CourierProfileMapper {

    private CourierProfileMapper() {
    }

    public static CourierProfileResponse toResponse(CourierProfile profile) {
        List<AvailabilitySlotDto> schedule = profile.getAvailabilitySlots().stream()
            .sorted(
                Comparator.comparing(CourierAvailabilitySlot::getDayOfWeek)
                    .thenComparing(CourierAvailabilitySlot::getStartTime)
            )
            .map(slot -> {
                AvailabilitySlotDto dto = new AvailabilitySlotDto();
                dto.setDayOfWeek(slot.getDayOfWeek());
                dto.setStart(slot.getStartTime());
                dto.setEnd(slot.getEndTime());
                return dto;
            })
            .toList();

        return CourierProfileResponse.builder()
            .displayName(profile.getDisplayName())
            .phone(profile.getPhone())
            .vehicle(CourierProfileResponse.VehicleDto.builder()
                .type(profile.getVehicleType() == null ? null : profile.getVehicleType().name())
                .plate(profile.getVehiclePlate())
                .capacityKg(profile.getVehicleCapacityKg())
                .capacityLiters(profile.getVehicleCapacityLiters())
                .build())
            .availability(CourierProfileResponse.AvailabilityDto.builder()
                .availableNow(profile.isAvailableNow())
                .weeklySchedule(schedule)
                .maxDistanceKm(profile.getMaxDistanceKm())
                .expressCapable(profile.isExpressCapable())
                .build())
            .build();
    }

    public static void applyUpdate(CourierProfile profile, UpdateCourierProfileRequest request) {
        profile.setDisplayName(request.getPersonalInfo().getDisplayName());
        profile.setPhone(request.getPersonalInfo().getPhone());

        profile.setVehicleType(request.getVehicle().getType());
        profile.setVehiclePlate(request.getVehicle().getPlate());
        profile.setVehicleCapacityKg(request.getVehicle().getCapacityKg());
        profile.setVehicleCapacityLiters(request.getVehicle().getCapacityLiters());

        profile.setAvailableNow(request.getAvailability().isAvailableNow());
        profile.setMaxDistanceKm(request.getAvailability().getMaxDistanceKm());
        profile.setExpressCapable(request.getAvailability().isExpressCapable());

        profile.getAvailabilitySlots().clear();
        for (AvailabilitySlotDto slotDto : request.getAvailability().getWeeklySchedule()) {
            CourierAvailabilitySlot slot = new CourierAvailabilitySlot();
            slot.setCourierProfile(profile);
            slot.setDayOfWeek(slotDto.getDayOfWeek());
            slot.setStartTime(slotDto.getStart());
            slot.setEndTime(slotDto.getEnd());
            profile.getAvailabilitySlots().add(slot);
        }
    }
}
