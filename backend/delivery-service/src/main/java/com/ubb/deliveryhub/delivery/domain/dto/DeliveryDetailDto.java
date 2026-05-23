package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Full delivery payload for detail views (#32 / #36): pricing snapshot, addresses, package,
 * optional courier summary, and status history timeline (ascending by time).
 */
@Value
@Builder
public class DeliveryDetailDto {
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
    CourierSummaryDto courier;
    List<TimelineEntryDto> timeline;
}
