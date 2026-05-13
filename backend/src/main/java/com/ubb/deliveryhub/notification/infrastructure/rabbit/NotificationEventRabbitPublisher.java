package com.ubb.deliveryhub.notification.infrastructure.rabbit;

import com.ubb.deliveryhub.notification.config.NotificationProperties;
import com.ubb.deliveryhub.notification.events.NotificationRequested;
import com.ubb.deliveryhub.notification.infrastructure.async.NotificationAsyncPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationEventRabbitPublisher implements NotificationAsyncPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventRabbitPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final NotificationProperties properties;

    public NotificationEventRabbitPublisher(
        RabbitTemplate rabbitTemplate,
        NotificationProperties properties
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.properties = properties;
    }

    @Override
    public void publish(NotificationRequested event) {
        rabbitTemplate.convertAndSend(
            properties.getAsync().getExchange(),
            properties.getAsync().getRoutingKey(),
            event
        );
        log.debug(
            "Published notification event to RabbitMQ eventId={} exchange={} routingKey={}",
            event.eventId(),
            properties.getAsync().getExchange(),
            properties.getAsync().getRoutingKey()
        );
    }
}
