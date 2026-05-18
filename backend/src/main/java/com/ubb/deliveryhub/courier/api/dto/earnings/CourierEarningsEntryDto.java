package com.ubb.deliveryhub.courier.api.dto.earnings;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class CourierEarningsEntryDto {
    UUID deliveryId;
    String trackingCode;
    BigDecimal amount;
    String currency;
    DeliveryStatus status;
    Instant earnedAt;
    String category;
    String note;
}
