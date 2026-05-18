package com.ubb.deliveryhub.delivery.infrastructure.rabbit;

import com.ubb.deliveryhub.delivery.application.DeliveryCreatedEventPublisher;
import com.ubb.deliveryhub.delivery.config.AsyncAssignmentProperties;
import com.ubb.deliveryhub.delivery.messaging.DeliveryCreatedMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class DeliveryCreatedRabbitPublisher implements DeliveryCreatedEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DeliveryCreatedRabbitPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final AsyncAssignmentProperties properties;

    public DeliveryCreatedRabbitPublisher(
        RabbitTemplate rabbitTemplate,
        AsyncAssignmentProperties properties
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.properties = properties;
    }

    @Override
    public void publish(DeliveryCreatedMessage message) {
        if (!properties.isEnabled()) {
            return;
        }
        rabbitTemplate.convertAndSend(
            properties.getExchange(),
            properties.getRoutingKey(),
            message
        );
        log.info(
            "Published DeliveryCreated eventId={} deliveryId={} exchange={} routingKey={}",
            message.eventId(),
            message.deliveryId(),
            properties.getExchange(),
            properties.getRoutingKey()
        );
    }
}
