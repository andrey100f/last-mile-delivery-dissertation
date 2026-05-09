package com.ubb.deliveryhub.tracking.service;

import com.ubb.deliveryhub.delivery.events.DeliveryStatusChangedEvent;
import com.ubb.deliveryhub.delivery.service.DeliveryTrackingProgress;
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
            DeliveryTrackingProgress.fromStatus(event.toStatus())
        );
        trackingEventPublisher.publish(payload);
    }
}
