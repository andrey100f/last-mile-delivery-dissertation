package com.ubb.deliveryhub.delivery.infrastructure.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.ubb.deliveryhub.delivery.application.AsyncAssignmentMetrics;
import com.ubb.deliveryhub.delivery.application.AsyncAssignmentOutcome;
import com.ubb.deliveryhub.delivery.application.AsyncAssignmentService;
import com.ubb.deliveryhub.delivery.application.MessageFailureClassifier;
import com.ubb.deliveryhub.delivery.application.exception.PermanentMessageProcessingException;
import com.ubb.deliveryhub.delivery.config.AsyncAssignmentProperties;
import com.ubb.deliveryhub.common.messaging.DeliveryCreatedMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.MessagePropertiesBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class DeliveryCreatedConsumer {

    private static final Logger log = LoggerFactory.getLogger(DeliveryCreatedConsumer.class);
    private static final String CONSUMER_NAME = "delivery-created-async-assignment-consumer";

    private final ObjectMapper objectMapper;
    private final AsyncAssignmentService asyncAssignmentService;
    private final RabbitTemplate rabbitTemplate;
    private final MessageFailureClassifier failureClassifier;
    private final AsyncAssignmentMetrics metrics;
    private final AsyncAssignmentProperties properties;

    public DeliveryCreatedConsumer(
        ObjectMapper objectMapper,
        AsyncAssignmentService asyncAssignmentService,
        RabbitTemplate rabbitTemplate,
        MessageFailureClassifier failureClassifier,
        AsyncAssignmentMetrics metrics,
        AsyncAssignmentProperties properties
    ) {
        this.objectMapper = objectMapper;
        this.asyncAssignmentService = asyncAssignmentService;
        this.rabbitTemplate = rabbitTemplate;
        this.failureClassifier = failureClassifier;
        this.metrics = metrics;
        this.properties = properties;
    }

    @RabbitListener(
        queues = "${delivery.assignment.async.queue:delivery.assign.async.q}",
        containerFactory = "manualAckRabbitListenerContainerFactory",
        autoStartup = "${delivery.assignment.async.consumer-enabled:false}"
    )
    public void consume(Message rawMessage, Channel channel, @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag)
        throws IOException {
        Instant startedAt = Instant.now();
        int attempt = readRetryCount(rawMessage);
        DeliveryCreatedMessage message = null;
        try {
            message = decodeAndValidate(rawMessage);
            AsyncAssignmentOutcome outcome = asyncAssignmentService.assignFromDeliveryCreated(message, CONSUMER_NAME);
            channel.basicAck(deliveryTag, false);
            String metricOutcome = toMetricOutcome(outcome);
            metrics.recordConsume(metricOutcome, Duration.between(startedAt, Instant.now()));
            log.info(
                "DeliveryCreated consumed eventId={} deliveryId={} attempt={} outcome={}",
                message.eventId(),
                message.deliveryId(),
                attempt,
                metricOutcome
            );
        } catch (Exception ex) {
            try {
                handleFailure(rawMessage, channel, deliveryTag, message, attempt, ex, startedAt);
            } catch (Exception failureHandlingEx) {
                log.error(
                    "Failure while handling DeliveryCreated error path; requeueing original message deliveryTag={}",
                    deliveryTag,
                    failureHandlingEx
                );
                channel.basicNack(deliveryTag, false, true);
            }
        }
    }

    private void handleFailure(
        Message rawMessage,
        Channel channel,
        long deliveryTag,
        DeliveryCreatedMessage message,
        int attempt,
        Exception ex,
        Instant startedAt
    ) throws IOException {
        MessageFailureClassifier.FailureType failureType = failureClassifier.classify(ex);
        String eventId = message == null || message.eventId() == null ? "unknown" : message.eventId().toString();
        String deliveryId = message == null || message.deliveryId() == null ? "unknown" : message.deliveryId().toString();
        if (failureType == MessageFailureClassifier.FailureType.PERMANENT) {
            publishToDlq(rawMessage, attempt, ex, "permanent_failure");
            channel.basicAck(deliveryTag, false);
            metrics.recordConsume("dlq", Duration.between(startedAt, Instant.now()));
            log.warn(
                "DeliveryCreated routed to DLQ eventId={} deliveryId={} attempt={} reason={}",
                eventId,
                deliveryId,
                attempt,
                extractFailureReason(ex)
            );
            return;
        }

        int nextAttempt = attempt + 1;
        if (nextAttempt > properties.getMaxRetries()) {
            publishToDlq(rawMessage, attempt, ex, "retry_exhausted");
            channel.basicAck(deliveryTag, false);
            metrics.recordConsume("dlq", Duration.between(startedAt, Instant.now()));
            metrics.recordRetryExhausted();
            log.warn(
                "DeliveryCreated retry exhausted, moved to DLQ eventId={} deliveryId={} attempts={}",
                eventId,
                deliveryId,
                attempt
            );
            return;
        }

        publishToRetry(rawMessage, nextAttempt, ex);
        channel.basicAck(deliveryTag, false);
        metrics.recordConsume("retry", Duration.between(startedAt, Instant.now()));
        log.warn(
            "DeliveryCreated scheduled for retry eventId={} deliveryId={} attempt={} maxRetries={} reason={}",
            eventId,
            deliveryId,
            nextAttempt,
            properties.getMaxRetries(),
            extractFailureReason(ex)
        );
    }

    private DeliveryCreatedMessage decodeAndValidate(Message rawMessage) {
        try {
            DeliveryCreatedMessage message = objectMapper.readValue(rawMessage.getBody(), DeliveryCreatedMessage.class);
            if (message.eventVersion() == null || message.eventVersion() != 1) {
                throw new PermanentMessageProcessingException(
                    "UNSUPPORTED_EVENT_VERSION",
                    "Unsupported eventVersion " + message.eventVersion()
                );
            }
            if (message.eventId() == null) {
                throw new PermanentMessageProcessingException("MISSING_EVENT_ID", "eventId is required");
            }
            if (message.deliveryId() == null) {
                throw new PermanentMessageProcessingException("MISSING_DELIVERY_ID", "deliveryId is required");
            }
            if (message.createdAt() == null) {
                throw new PermanentMessageProcessingException("MISSING_CREATED_AT", "createdAt is required");
            }
            return message;
        } catch (PermanentMessageProcessingException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PermanentMessageProcessingException(
                "INVALID_PAYLOAD",
                "Failed to decode DeliveryCreated payload",
                ex
            );
        }
    }

    private void publishToRetry(Message original, int nextAttempt, Exception ex) {
        long delayMillis = resolveBackoffMillis(nextAttempt);
        MessageProperties propertiesCopy = MessagePropertiesBuilder
            .fromClonedProperties(original.getMessageProperties())
            .build();
        Message retryMessage = MessageBuilder
            .withBody(original.getBody())
            .andProperties(propertiesCopy)
            .setHeader("x-retry-count", nextAttempt)
            .setHeader("x-last-failure-reason", extractFailureReason(ex))
            .setHeader("x-last-exception-class", ex.getClass().getName())
            .setHeaderIfAbsent("x-first-failure-at", Instant.now().toString())
            .setExpiration(Long.toString(delayMillis))
            .build();
        rabbitTemplate.send(properties.getExchange(), properties.getRetryRoutingKey(), retryMessage);
    }

    private void publishToDlq(Message original, int retryCount, Exception ex, String failureReason) {
        Map<String, Object> headers = new LinkedHashMap<>(original.getMessageProperties().getHeaders());
        headers.put("x-failure-reason", failureReason + ":" + extractFailureReason(ex));
        headers.put("x-exception-class", ex.getClass().getName());
        headers.put("x-original-routing-key", original.getMessageProperties().getReceivedRoutingKey());
        headers.put("x-retry-count", retryCount);
        headers.putIfAbsent("x-first-failure-at", Instant.now().toString());

        MessageProperties propertiesCopy = MessagePropertiesBuilder
            .fromClonedProperties(original.getMessageProperties())
            .build();
        Message dlqMessage = MessageBuilder
            .withBody(original.getBody())
            .andProperties(propertiesCopy)
            .copyHeaders(headers)
            .build();
        rabbitTemplate.send(properties.getDlx(), properties.getDlqRoutingKey(), dlqMessage);
    }

    private static int readRetryCount(Message rawMessage) {
        Object value = rawMessage.getMessageProperties().getHeaders().get("x-retry-count");
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Integer.parseInt(stringValue);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private long resolveBackoffMillis(int nextAttempt) {
        if (properties.getRetryBackoffMillis().isEmpty()) {
            return 1000L;
        }
        int index = Math.max(0, Math.min(nextAttempt - 1, properties.getRetryBackoffMillis().size() - 1));
        return properties.getRetryBackoffMillis().get(index);
    }

    private static String extractFailureReason(Exception ex) {
        if (ex instanceof PermanentMessageProcessingException permanent && permanent.reason() != null) {
            return permanent.reason();
        }
        return ex.getClass().getSimpleName();
    }

    private static String toMetricOutcome(AsyncAssignmentOutcome outcome) {
        return switch (outcome) {
            case ASSIGNED -> "success";
            case NOOP_DUPLICATE, NOOP_ALREADY_ASSIGNED -> "noop";
        };
    }
}
