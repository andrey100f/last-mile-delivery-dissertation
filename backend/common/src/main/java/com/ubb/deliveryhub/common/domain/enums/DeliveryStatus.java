package com.ubb.deliveryhub.common.domain.enums;

/**
 * Delivery lifecycle; initial row uses {@link #CREATED} (POST in #31).
 */
public enum DeliveryStatus {
    CREATED,
    ASSIGNED,
    PICKED_UP,
    IN_TRANSIT,
    DELIVERED,
    CANCELLED,
    FAILED
}
