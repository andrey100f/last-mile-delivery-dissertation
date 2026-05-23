package com.ubb.deliveryhub.tracking.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TrackingRabbitConfig {

    @Bean
    public MessageConverter rabbitMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    TopicExchange trackingExchange(@Value("${tracking.messaging.exchange:tracking.events}") String exchange) {
        return new TopicExchange(exchange, true, false);
    }

    @Bean
    Queue trackingStatusQueue(@Value("${tracking.messaging.queue:tracking.status.q}") String queue) {
        return new Queue(queue, true);
    }

    @Bean
    Binding trackingStatusBinding(
        Queue trackingStatusQueue,
        TopicExchange trackingExchange,
        @Value("${tracking.messaging.routing-key:delivery.status.changed}") String routingKey
    ) {
        return BindingBuilder.bind(trackingStatusQueue).to(trackingExchange).with(routingKey);
    }
}
