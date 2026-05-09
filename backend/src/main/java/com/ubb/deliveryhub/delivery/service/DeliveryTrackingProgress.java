package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;

/**
 * Shared progress heuristic used by tracking payloads (polling and WebSocket).
 */
public final class DeliveryTrackingProgress {

    private DeliveryTrackingProgress() {
    }

    public static Integer fromStatus(DeliveryStatus status) {
        return switch (status) {
            case CREATED -> 0;
            case ASSIGNED -> 25;
            case PICKED_UP -> 50;
            case IN_TRANSIT -> 75;
            case DELIVERED -> 100;
            case CANCELLED, FAILED -> null;
        };
    }
}
