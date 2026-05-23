package com.ubb.deliveryhub.tracking.infrastructure.messaging;

import com.ubb.deliveryhub.common.messaging.DeliveryStatusChangedMessage;
import com.ubb.deliveryhub.common.domain.DeliveryTrackingProgress;
import com.ubb.deliveryhub.tracking.api.dto.TrackingStatusEvent;
import com.ubb.deliveryhub.tracking.service.TrackingEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class DeliveryStatusChangedConsumer {

    private static final Logger log = LoggerFactory.getLogger(DeliveryStatusChangedConsumer.class);

    private final TrackingEventPublisher trackingEventPublisher;

    public DeliveryStatusChangedConsumer(TrackingEventPublisher trackingEventPublisher) {
        this.trackingEventPublisher = trackingEventPublisher;
    }

    @RabbitListener(queues = "${tracking.messaging.queue:tracking.status.q}")
    public void onDeliveryStatusChanged(DeliveryStatusChangedMessage event) {
        log.debug("Received tracking message deliveryId={} status={}", event.deliveryId(), event.toStatus());
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
