package com.ubb.deliveryhub.tracking.service;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.events.DeliveryStatusChangedEvent;
import com.ubb.deliveryhub.tracking.api.dto.TrackingStatusEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class DeliveryStatusChangedTrackingListener {

    private final TrackingEventPublisher trackingEventPublisher;

    public DeliveryStatusChangedTrackingListener(TrackingEventPublisher trackingEventPublisher) {
        this.trackingEventPublisher = trackingEventPublisher;
    }

    @EventListener
    public void onDeliveryStatusChanged(DeliveryStatusChangedEvent event) {
        TrackingStatusEvent payload = new TrackingStatusEvent(
            TrackingStatusEvent.EVENT_VERSION,
            event.deliveryId(),
            event.toStatus(),
            event.updatedAt(),
            null,
            progressPercent(event.toStatus())
        );
        trackingEventPublisher.publish(payload);
    }

    private static Integer progressPercent(DeliveryStatus status) {
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
