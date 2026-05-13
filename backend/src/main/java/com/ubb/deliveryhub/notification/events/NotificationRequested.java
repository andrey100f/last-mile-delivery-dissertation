package com.ubb.deliveryhub.notification.events;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record NotificationRequested(
    UUID eventId,
    NotificationEventType eventType,
    UUID deliveryId,
    UUID actorUserId,
    List<UUID> targetUserIds,
    DeliveryStatus status,
    Instant occurredAt,
    Map<String, Object> metadata
) {
}
