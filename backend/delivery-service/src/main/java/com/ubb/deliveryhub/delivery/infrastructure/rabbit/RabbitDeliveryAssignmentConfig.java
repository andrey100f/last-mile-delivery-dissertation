package com.ubb.deliveryhub.delivery.infrastructure.rabbit;

import com.ubb.deliveryhub.delivery.config.AsyncAssignmentProperties;
import org.springframework.amqp.core.AcknowledgeMode;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class RabbitDeliveryAssignmentConfig {

    @Bean
    public TopicExchange deliveryEventsExchange(AsyncAssignmentProperties properties) {
        return new TopicExchange(properties.getExchange(), true, false);
    }

    @Bean
    public DirectExchange deliveryAssignmentDlx(AsyncAssignmentProperties properties) {
        return new DirectExchange(properties.getDlx(), true, false);
    }

    @Bean
    public Queue deliveryAssignAsyncQueue(AsyncAssignmentProperties properties) {
        return new Queue(properties.getQueue(), true);
    }

    @Bean
    public Queue deliveryAssignAsyncRetryQueue(AsyncAssignmentProperties properties) {
        return new Queue(
            properties.getRetryQueue(),
            true,
            false,
            false,
            Map.of(
                "x-dead-letter-exchange", properties.getExchange(),
                "x-dead-letter-routing-key", properties.getRoutingKey()
            )
        );
    }

    @Bean
    public Queue deliveryAssignAsyncDlq(AsyncAssignmentProperties properties) {
        return new Queue(properties.getDlq(), true);
    }

    @Bean
    public Binding deliveryAssignAsyncBinding(
        @Qualifier("deliveryAssignAsyncQueue") Queue deliveryAssignAsyncQueue,
        TopicExchange deliveryEventsExchange,
        AsyncAssignmentProperties properties
    ) {
        return BindingBuilder
            .bind(deliveryAssignAsyncQueue)
            .to(deliveryEventsExchange)
            .with(properties.getRoutingKey());
    }

    @Bean
    public Binding deliveryAssignAsyncRetryBinding(
        @Qualifier("deliveryAssignAsyncRetryQueue") Queue deliveryAssignAsyncRetryQueue,
        TopicExchange deliveryEventsExchange,
        AsyncAssignmentProperties properties
    ) {
        return BindingBuilder
            .bind(deliveryAssignAsyncRetryQueue)
            .to(deliveryEventsExchange)
            .with(properties.getRetryRoutingKey());
    }

    @Bean
    public Binding deliveryAssignAsyncDlqBinding(
        @Qualifier("deliveryAssignAsyncDlq") Queue deliveryAssignAsyncDlq,
        DirectExchange deliveryAssignmentDlx,
        AsyncAssignmentProperties properties
    ) {
        return BindingBuilder
            .bind(deliveryAssignAsyncDlq)
            .to(deliveryAssignmentDlx)
            .with(properties.getDlqRoutingKey());
    }

    @Bean(name = "manualAckRabbitListenerContainerFactory")
    public SimpleRabbitListenerContainerFactory manualAckRabbitListenerContainerFactory(
        ConnectionFactory connectionFactory
    ) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        factory.setDefaultRequeueRejected(false);
        return factory;
    }
}
