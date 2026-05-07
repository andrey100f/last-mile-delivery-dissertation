package com.ubb.deliveryhub.delivery.domain.dto;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;

public enum DeliveryStatusAction {
    PICKED_UP(DeliveryStatus.PICKED_UP),
    IN_TRANSIT(DeliveryStatus.IN_TRANSIT),
    DELIVERED(DeliveryStatus.DELIVERED);

    private final DeliveryStatus targetStatus;

    DeliveryStatusAction(DeliveryStatus targetStatus) {
        this.targetStatus = targetStatus;
    }

    public DeliveryStatus targetStatus() {
        return targetStatus;
    }
}
