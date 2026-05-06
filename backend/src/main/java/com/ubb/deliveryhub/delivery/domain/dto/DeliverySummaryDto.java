package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Row shape for customer delivery lists (#33 / Angular #35); camelCase for JSON.
 * Route rendering uses destinationLine1 (main) and pickupLine1 (hint).
 */
@Value
@Builder
public class DeliverySummaryDto {
    String id;
    String status;
    String deliveryType;
    Instant createdAt;
    BigDecimal totalAmount;
    String currency;
    String pickupLine1;
    String destinationLine1;
}
