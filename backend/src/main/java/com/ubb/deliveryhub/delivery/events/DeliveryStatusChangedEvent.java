package com.ubb.deliveryhub.delivery.events;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;

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
