package com.ubb.deliveryhub.notification.infrastructure.rabbit;

import com.ubb.deliveryhub.notification.config.NotificationProperties;
import org.springframework.amqp.core.AcknowledgeMode;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class NotificationRabbitConfig {

    @Bean
    public MessageConverter notificationMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean(name = "manualAckNotificationRabbitListenerContainerFactory")
    public SimpleRabbitListenerContainerFactory manualAckNotificationRabbitListenerContainerFactory(
        ConnectionFactory connectionFactory
    ) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        factory.setDefaultRequeueRejected(false);
        return factory;
    }

    @Bean
    public TopicExchange notificationEventsExchange(NotificationProperties properties) {
        return new TopicExchange(properties.getAsync().getExchange(), true, false);
    }

    @Bean
    public DirectExchange notificationDlqExchange(NotificationProperties properties) {
        return new DirectExchange(properties.getAsync().getDlx(), true, false);
    }

    @Bean
    public Queue notificationConsumeQueue(NotificationProperties properties) {
        return new Queue(properties.getAsync().getQueue(), true);
    }

    @Bean
    public Queue notificationConsumeRetryQueue(NotificationProperties properties) {
        return new Queue(
            properties.getAsync().getRetryQueue(),
            true,
            false,
            false,
            Map.of(
                "x-dead-letter-exchange", properties.getAsync().getExchange(),
                "x-dead-letter-routing-key", properties.getAsync().getRoutingKey()
            )
        );
    }

    @Bean
    public Queue notificationConsumeDlq(NotificationProperties properties) {
        return new Queue(properties.getAsync().getDlq(), true);
    }

    @Bean
    public Binding notificationConsumeBinding(
        @Qualifier("notificationConsumeQueue") Queue notificationConsumeQueue,
        TopicExchange notificationEventsExchange,
        NotificationProperties properties
    ) {
        return BindingBuilder
            .bind(notificationConsumeQueue)
            .to(notificationEventsExchange)
            .with(properties.getAsync().getRoutingKey());
    }

    @Bean
    public Binding notificationConsumeRetryBinding(
        @Qualifier("notificationConsumeRetryQueue") Queue notificationConsumeRetryQueue,
        TopicExchange notificationEventsExchange,
        NotificationProperties properties
    ) {
        return BindingBuilder
            .bind(notificationConsumeRetryQueue)
            .to(notificationEventsExchange)
            .with(properties.getAsync().getRetryRoutingKey());
    }

    @Bean
    public Binding notificationConsumeDlqBinding(
        @Qualifier("notificationConsumeDlq") Queue notificationConsumeDlq,
        DirectExchange notificationDlqExchange,
        NotificationProperties properties
    ) {
        return BindingBuilder
            .bind(notificationConsumeDlq)
            .to(notificationDlqExchange)
            .with(properties.getAsync().getDlqRoutingKey());
    }
}
