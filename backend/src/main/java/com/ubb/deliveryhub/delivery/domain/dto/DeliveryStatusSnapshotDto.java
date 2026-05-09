package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

/**
 * Compact delivery status payload for high-frequency polling (#44).
 */
@Value
@Builder
public class DeliveryStatusSnapshotDto {
    String status;
    Integer etaMinutes;
    Instant updatedAt;
    Integer progressPercent;
}
