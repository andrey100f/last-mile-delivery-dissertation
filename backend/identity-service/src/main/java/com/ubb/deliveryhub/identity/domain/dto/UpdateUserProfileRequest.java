package com.ubb.deliveryhub.identity.domain.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserProfileRequest {

    @NotNull
    @Valid
    @JsonAlias("personalInfo")
    private PersonalDto personal;

    @Data
    public static class PersonalDto {

        @NotBlank
        @Size(max = 255)
        private String displayName;

        @NotBlank
        @Size(max = 40)
        @Pattern(regexp = "^[+0-9()\\-.\\s]{7,40}$")
        private String phone;
    }
}
