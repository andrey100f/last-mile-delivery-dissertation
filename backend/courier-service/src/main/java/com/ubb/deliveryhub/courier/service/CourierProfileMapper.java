package com.ubb.deliveryhub.courier.service;

import com.ubb.deliveryhub.courier.api.dto.CourierProfileResponse;
import com.ubb.deliveryhub.courier.api.dto.UpdateCourierProfileRequest;
import com.ubb.deliveryhub.courier.domain.CourierProfile;

public final class CourierProfileMapper {

    private CourierProfileMapper() {
    }

    public static CourierProfileResponse toResponse(CourierProfile profile) {
        return CourierProfileResponse.builder()
            .personal(CourierProfileResponse.PersonalDto.builder()
                .displayName(profile.getDisplayName())
                .phone(profile.getPhone())
                .build())
            .availability(CourierProfileResponse.AvailabilityDto.builder()
                .availableNow(profile.isAvailableNow())
                .expressCapable(profile.isExpressCapable())
                .build())
            .build();
    }

    public static void applyUpdate(CourierProfile profile, UpdateCourierProfileRequest request) {
        profile.setDisplayName(request.getPersonal().getDisplayName());
        profile.setPhone(request.getPersonal().getPhone());
        if (profile.getUser() != null) {
            profile.getUser().setDisplayName(request.getPersonal().getDisplayName());
            profile.getUser().setPhoneNumber(request.getPersonal().getPhone());
        }

        profile.setAvailableNow(request.getAvailability().isAvailableNow());
        profile.setExpressCapable(request.getAvailability().isExpressCapable());
    }
}
