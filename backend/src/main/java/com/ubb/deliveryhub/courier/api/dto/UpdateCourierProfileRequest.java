package com.ubb.deliveryhub.courier.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateCourierProfileRequest {

    @NotNull
    @Valid
    @JsonAlias("personalInfo")
    private PersonalInfoDto personal;

    @NotNull
    @Valid
    private AvailabilityDto availability;

    @Data
    public static class PersonalInfoDto {

        @NotBlank
        @Size(max = 255)
        private String displayName;

        @Size(max = 64)
        private String phone;
    }

    @Data
    public static class AvailabilityDto {

        private boolean availableNow;

        @JsonAlias("acceptExpress")
        private boolean expressCapable;
    }
}
