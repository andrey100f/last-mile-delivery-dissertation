package com.ubb.deliveryhub.courier.api.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CourierProfileResponse {
    PersonalDto personal;
    AvailabilityDto availability;

    @Value
    @Builder
    public static class PersonalDto {
        String displayName;
        String phone;
    }

    @Value
    @Builder
    public static class AvailabilityDto {
        boolean availableNow;
        boolean expressCapable;
    }
}
