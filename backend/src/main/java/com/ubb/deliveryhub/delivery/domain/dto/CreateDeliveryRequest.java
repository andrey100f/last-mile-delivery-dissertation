package com.ubb.deliveryhub.delivery.domain.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateDeliveryRequest {

    @NotNull
    @Valid
    private AddressContactRequestDto pickup;

    @NotNull
    @Valid
    private AddressContactRequestDto destination;

    @NotNull
    @Valid
    @JsonProperty("package")
    private PackageRequestDto packageDetails;

    @NotNull
    private DeliveryType deliveryType;

    @Size(max = 2000)
    private String specialInstructions;
}
