package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

/**
 * Courier-facing row shape for available delivery cards (#37).
 */
@Value
@Builder
public class AvailableDeliveryDto {
    String id;
    String trackingCode;
    String status;
    String deliveryType;
    String pickupLine1;
    String destinationLine1;
    BigDecimal baseAmount;
    BigDecimal feeAmount;
    BigDecimal taxAmount;
    BigDecimal totalAmount;
    String currency;
    BigDecimal distanceKm;
    Integer etaMinutes;
}
