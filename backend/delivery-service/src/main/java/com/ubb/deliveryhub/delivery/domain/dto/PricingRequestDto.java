package com.ubb.deliveryhub.delivery.domain.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PricingRequestDto {

    @NotNull
    @PositiveOrZero
    @DecimalMax("999999999999999.9999")
    private BigDecimal baseAmount;

    @NotNull
    @PositiveOrZero
    @DecimalMax("999999999999999.9999")
    private BigDecimal feeAmount;

    @NotNull
    @PositiveOrZero
    @DecimalMax("999999999999999.9999")
    private BigDecimal taxAmount;

    @NotNull
    @PositiveOrZero
    @DecimalMax("999999999999999.9999")
    private BigDecimal totalAmount;

    @NotBlank
    @Size(max = 3)
    private String currency;
}
