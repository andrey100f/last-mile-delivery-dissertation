package com.ubb.deliveryhub.common.messaging;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

import java.time.Instant;
import java.util.UUID;

public record DeliveryStatusChangedMessage(
    Integer eventVersion,
    UUID eventId,
    String correlationId,
    UUID deliveryId,
    DeliveryStatus fromStatus,
    DeliveryStatus toStatus,
    UUID actorId,
    Instant updatedAt
) {
    public static final int EVENT_VERSION = 1;
}
