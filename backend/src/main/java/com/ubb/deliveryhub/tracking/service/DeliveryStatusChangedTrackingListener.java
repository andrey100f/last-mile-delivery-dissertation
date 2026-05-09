package com.ubb.deliveryhub.tracking.service;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.events.DeliveryStatusChangedEvent;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.tracking.api.dto.TrackingStatusEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class DeliveryStatusChangedTrackingListener {

    private static final Logger log = LoggerFactory.getLogger(DeliveryStatusChangedTrackingListener.class);

    private final DeliveryRepository deliveryRepository;
    private final TrackingEventPublisher trackingEventPublisher;

    public DeliveryStatusChangedTrackingListener(
        DeliveryRepository deliveryRepository,
        TrackingEventPublisher trackingEventPublisher
    ) {
        this.deliveryRepository = deliveryRepository;
        this.trackingEventPublisher = trackingEventPublisher;
    }

    @EventListener
    public void onDeliveryStatusChanged(DeliveryStatusChangedEvent event) {
        deliveryRepository.findById(event.deliveryId()).ifPresentOrElse(delivery -> {
            TrackingStatusEvent payload = new TrackingStatusEvent(
                TrackingStatusEvent.EVENT_VERSION,
                event.deliveryId(),
                event.toStatus(),
                delivery.getUpdatedAt(),
                null,
                progressPercent(event.toStatus())
            );
            trackingEventPublisher.publish(payload);
        }, () -> log.warn("Skipping tracking publish because deliveryId={} no longer exists", event.deliveryId()));
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
