package com.ubb.deliveryhub.notification.infrastructure.rabbit;

import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NotificationRabbitConfig {

    @Bean
    public MessageConverter notificationMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
