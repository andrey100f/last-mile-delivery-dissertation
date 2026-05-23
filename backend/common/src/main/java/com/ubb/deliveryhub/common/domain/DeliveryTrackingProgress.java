package com.ubb.deliveryhub.common.domain;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

public final class DeliveryTrackingProgress {

    private DeliveryTrackingProgress() {
    }

    public static int fromStatus(DeliveryStatus status) {
        if (status == null) {
            return 0;
        }
        return switch (status) {
            case CREATED -> 0;
            case ASSIGNED -> 20;
            case PICKED_UP -> 45;
            case IN_TRANSIT -> 75;
            case DELIVERED -> 100;
            case CANCELLED, FAILED -> 0;
        };
    }
}
