package com.ubb.deliveryhub.delivery.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddressContactRequestDto {

    @NotBlank
    @Size(max = 255)
    private String line1;

    @NotBlank
    @Size(max = 255)
    private String contactName;

    @NotBlank
    @Size(max = 64)
    private String contactPhone;
}
