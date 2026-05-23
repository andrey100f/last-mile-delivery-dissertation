package com.ubb.deliveryhub.delivery.events;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

import java.time.Instant;
import java.util.UUID;

public record DeliveryStatusChangedEvent(
    UUID deliveryId,
    DeliveryStatus fromStatus,
    DeliveryStatus toStatus,
    UUID actorId,
    Instant updatedAt
) {
}
