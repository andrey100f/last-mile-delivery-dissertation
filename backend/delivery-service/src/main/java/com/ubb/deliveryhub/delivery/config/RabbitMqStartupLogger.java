package com.ubb.deliveryhub.delivery.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RabbitMqStartupLogger implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(RabbitMqStartupLogger.class);

    @Value("${spring.rabbitmq.host:}")
    private String host;

    @Value("${spring.rabbitmq.port:5672}")
    private int port;

    @Value("${spring.rabbitmq.username:}")
    private String username;

    @Value("${spring.rabbitmq.virtual-host:/}")
    private String virtualHost;

    public RabbitMqStartupLogger(ConnectionFactory connectionFactory) {
        // Ensures RabbitMQ auto-config ran before logging.
    }

    @Override
    public void afterSingletonsInstantiated() {
        log.info(
            "RabbitMQ client configured: host={}, port={}, username={}, virtualHost={}",
            host,
            port,
            username,
            virtualHost
        );
    }
}
