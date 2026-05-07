package com.ubb.deliveryhub.delivery.domain;

import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliveryStatusTransitionException;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Component
public class DeliveryStateMachine {

    private final Map<DeliveryStatus, Set<DeliveryStatus>> allowedTransitions;

    public DeliveryStateMachine() {
        EnumMap<DeliveryStatus, Set<DeliveryStatus>> matrix = new EnumMap<>(DeliveryStatus.class);
        matrix.put(DeliveryStatus.CREATED, EnumSet.of(DeliveryStatus.ASSIGNED));
        matrix.put(DeliveryStatus.ASSIGNED, EnumSet.of(DeliveryStatus.PICKED_UP));
        matrix.put(DeliveryStatus.PICKED_UP, EnumSet.of(DeliveryStatus.IN_TRANSIT));
        matrix.put(DeliveryStatus.IN_TRANSIT, EnumSet.of(DeliveryStatus.DELIVERED));
        matrix.put(DeliveryStatus.DELIVERED, EnumSet.noneOf(DeliveryStatus.class));
        matrix.put(DeliveryStatus.CANCELLED, EnumSet.noneOf(DeliveryStatus.class));
        matrix.put(DeliveryStatus.FAILED, EnumSet.noneOf(DeliveryStatus.class));
        this.allowedTransitions = Collections.unmodifiableMap(matrix);
    }

    public void assertTransitionAllowed(DeliveryStatus from, DeliveryStatus to) {
        Set<DeliveryStatus> allowedTargets = allowedTargetsFrom(from);
        if (!allowedTargets.contains(to)) {
            throw new InvalidDeliveryStatusTransitionException(from, to, allowedTargets);
        }
    }

    public Set<DeliveryStatus> allowedTargetsFrom(DeliveryStatus from) {
        return Set.copyOf(allowedTransitions.getOrDefault(from, Set.of()));
    }
}
