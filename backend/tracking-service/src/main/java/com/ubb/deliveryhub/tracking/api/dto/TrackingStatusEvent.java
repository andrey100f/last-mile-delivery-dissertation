package com.ubb.deliveryhub.tracking.api.dto;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

import java.time.Instant;
import java.util.UUID;

public record TrackingStatusEvent(
    int eventVersion,
    UUID deliveryId,
    DeliveryStatus status,
    Instant updatedAt,
    Integer etaMinutes,
    Integer progressPercent
) {
    public static final int EVENT_VERSION = 1;
}
