package com.ubb.deliveryhub.delivery.infrastructure.messaging;

import com.ubb.deliveryhub.common.messaging.DeliveryStatusChangedMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DeliveryTrackingPublisher {

    private static final Logger log = LoggerFactory.getLogger(DeliveryTrackingPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Value("${tracking.messaging.exchange:tracking.events}")
    private String exchange;

    @Value("${tracking.messaging.routing-key:delivery.status.changed}")
    private String routingKey;

    public void publish(DeliveryStatusChangedMessage event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
            log.debug("Published tracking event deliveryId={} to {}:{}", event.deliveryId(), exchange, routingKey);
        } catch (RuntimeException ex) {
            log.warn(
                "Failed to publish tracking event deliveryId={} to {}:{}",
                event.deliveryId(),
                exchange,
                routingKey,
                ex
            );
        }
    }
}
