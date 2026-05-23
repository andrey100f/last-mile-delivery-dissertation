package com.ubb.deliveryhub.delivery.infrastructure.messaging;

import com.ubb.deliveryhub.common.messaging.NotificationRequested;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DeliveryNotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(DeliveryNotificationPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Value("${notifications.async.exchange:notification.events}")
    private String exchange;

    @Value("${notifications.async.routing-key:notification.requested}")
    private String routingKey;

    public void publish(NotificationRequested event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
            log.debug("Published notification eventId={} to {}:{}", event.eventId(), exchange, routingKey);
        } catch (RuntimeException ex) {
            log.warn(
                "Failed to publish notification eventId={} to {}:{}",
                event.eventId(),
                exchange,
                routingKey,
                ex
            );
        }
    }
}
