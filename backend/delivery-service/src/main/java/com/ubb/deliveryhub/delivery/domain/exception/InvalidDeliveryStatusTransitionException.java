package com.ubb.deliveryhub.delivery.domain.exception;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import lombok.Getter;

import java.util.Set;

@Getter
public class InvalidDeliveryStatusTransitionException extends RuntimeException {

    private final DeliveryStatus fromStatus;
    private final DeliveryStatus toStatus;
    private final Set<DeliveryStatus> allowedTargets;

    public InvalidDeliveryStatusTransitionException(
        DeliveryStatus fromStatus,
        DeliveryStatus toStatus,
        Set<DeliveryStatus> allowedTargets
    ) {
        super("Invalid status transition from %s to %s".formatted(fromStatus, toStatus));
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.allowedTargets = Set.copyOf(allowedTargets);
    }
}
