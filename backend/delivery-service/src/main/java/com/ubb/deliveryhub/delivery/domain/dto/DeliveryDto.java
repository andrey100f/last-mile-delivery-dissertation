package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response shape for POST/GET deliveries (task #31 / #32); property names are camelCase for Angular (#34).
 */
@Value
@Builder
public class DeliveryDto {
    String id;
    String trackingCode;
    String status;
    String deliveryType;
    AddressContactDto pickup;
    AddressContactDto destination;
    BigDecimal packageWeightKg;
    String packageDescription;
    BigDecimal baseAmount;
    BigDecimal feeAmount;
    BigDecimal taxAmount;
    BigDecimal totalAmount;
    String currency;
    String specialInstructions;
    Instant createdAt;
    Instant updatedAt;
}
