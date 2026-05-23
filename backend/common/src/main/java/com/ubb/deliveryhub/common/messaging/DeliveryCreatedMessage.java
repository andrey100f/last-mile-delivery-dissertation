package com.ubb.deliveryhub.common.messaging;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record DeliveryCreatedMessage(
    Integer eventVersion,
    UUID eventId,
    String messageId,
    UUID deliveryId,
    UUID customerId,
    Instant createdAt,
    String correlationId,
    Map<String, Object> metadata
) {
}
