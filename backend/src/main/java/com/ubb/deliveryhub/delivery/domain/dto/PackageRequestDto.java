package com.ubb.deliveryhub.delivery.domain.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PackageRequestDto {

    @NotNull
    @Positive(message = "must be greater than 0")
    @DecimalMax(value = "999999")
    private BigDecimal weightKg;

    @NotBlank
    @Size(max = 1000)
    private String description;
}
