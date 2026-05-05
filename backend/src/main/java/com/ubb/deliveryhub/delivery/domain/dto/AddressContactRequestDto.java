package com.ubb.deliveryhub.delivery.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddressContactRequestDto {

    @NotBlank
    @Size(max = 255)
    private String line1;

    @Size(max = 255)
    private String line2;

    @NotBlank
    @Size(max = 128)
    private String city;

    @Size(max = 128)
    private String region;

    @NotBlank
    @Size(max = 32)
    private String postalCode;

    /**
     * ISO 3166-1 alpha-2 (e.g. RO).
     */
    @NotBlank
    @Size(min = 2, max = 2)
    @Pattern(regexp = "[A-Z]{2}", message = "must be two uppercase letters")
    private String country;

    @NotBlank
    @Size(max = 255)
    private String contactName;

    @NotBlank
    @Size(max = 64)
    private String contactPhone;
}
