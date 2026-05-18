package com.ubb.deliveryhub.notification.infrastructure.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.ubb.deliveryhub.notification.application.NotificationAsyncMetrics;
import com.ubb.deliveryhub.notification.application.NotificationAsyncProcessor;
import com.ubb.deliveryhub.notification.application.NotificationMessageFailureClassifier;
import com.ubb.deliveryhub.notification.application.exception.PermanentNotificationMessageException;
import com.ubb.deliveryhub.notification.config.NotificationProperties;
import com.ubb.deliveryhub.notification.events.NotificationRequested;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
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
import java.util.UUID;

@Component
public class NotificationRequestedConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationRequestedConsumer.class);

    private final ObjectMapper objectMapper;
    private final NotificationAsyncProcessor processor;
    private final NotificationMessageFailureClassifier failureClassifier;
    private final NotificationAsyncMetrics metrics;
    private final RabbitTemplate rabbitTemplate;
    private final NotificationProperties properties;

    public NotificationRequestedConsumer(
        ObjectMapper objectMapper,
        NotificationAsyncProcessor processor,
        NotificationMessageFailureClassifier failureClassifier,
        NotificationAsyncMetrics metrics,
        RabbitTemplate rabbitTemplate,
        NotificationProperties properties
    ) {
        this.objectMapper = objectMapper;
        this.processor = processor;
        this.failureClassifier = failureClassifier;
        this.metrics = metrics;
        this.rabbitTemplate = rabbitTemplate;
        this.properties = properties;
    }

    @RabbitListener(
        queues = "${notifications.async.queue:notification.consume.q}",
        containerFactory = "manualAckNotificationRabbitListenerContainerFactory",
        autoStartup = "${notifications.async.consumer-enabled:false}"
    )
    public void consume(Message rawMessage, Channel channel, @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag)
        throws IOException {
        Instant startedAt = Instant.now();
        int attempt = readRetryCount(rawMessage);
        NotificationRequested message = null;
        try {
            message = decodeAndValidate(rawMessage);
            String correlationId = resolveCorrelationId(message, rawMessage);
            String previousCorrelationId = MDC.get("correlationId");
            try {
                if (correlationId != null && !correlationId.isBlank()) {
                    MDC.put("correlationId", correlationId);
                }
                processMessage(channel, deliveryTag, attempt, message, startedAt);
            } finally {
                restoreCorrelation(previousCorrelationId);
            }
        } catch (Exception ex) {
            try {
                handleFailure(rawMessage, channel, deliveryTag, message, attempt, ex, startedAt);
            } catch (Exception failureHandlingEx) {
                log.error(
                    "Failure while handling NotificationRequested error path; requeueing original message deliveryTag={}",
                    deliveryTag,
                    failureHandlingEx
                );
                channel.basicNack(deliveryTag, false, true);
            }
        }
    }

    private void processMessage(
        Channel channel,
        long deliveryTag,
        int attempt,
        NotificationRequested message,
        Instant startedAt
    ) throws IOException {
        NotificationAsyncProcessor.Outcome outcome = processor.process(message);
        channel.basicAck(deliveryTag, false);
        String metricOutcome = outcome == NotificationAsyncProcessor.Outcome.DUPLICATE ? "duplicate" : "success";
        metrics.recordConsume(metricOutcome, Duration.between(startedAt, Instant.now()));
        log.info(
            "NotificationRequested consumed eventId={} correlationId={} eventType={} targetCount={} attempt={} outcome={}",
            message.eventId(),
            message.correlationId(),
            message.eventType(),
            message.targetUserIds().size(),
            attempt,
            metricOutcome
        );
    }

    private void handleFailure(
        Message rawMessage,
        Channel channel,
        long deliveryTag,
        NotificationRequested message,
        int attempt,
        Exception ex,
        Instant startedAt
    ) throws IOException {
        NotificationMessageFailureClassifier.FailureType failureType = failureClassifier.classify(ex);
        String eventId = message == null || message.eventId() == null ? "unknown" : message.eventId().toString();
        String correlationId = resolveCorrelationId(message, rawMessage);
        if (failureType == NotificationMessageFailureClassifier.FailureType.PERMANENT) {
            publishToDlq(rawMessage, attempt, ex, "permanent_failure", correlationId);
            channel.basicAck(deliveryTag, false);
            metrics.recordConsume("dlq", Duration.between(startedAt, Instant.now()));
            log.warn(
                "NotificationRequested routed to DLQ eventId={} correlationId={} attempt={} reason={}",
                eventId,
                correlationId,
                attempt,
                extractFailureReason(ex)
            );
            return;
        }

        int nextAttempt = attempt + 1;
        if (nextAttempt > properties.getAsync().getMaxRetries()) {
            publishToDlq(rawMessage, attempt, ex, "retry_exhausted", correlationId);
            channel.basicAck(deliveryTag, false);
            metrics.recordConsume("dlq", Duration.between(startedAt, Instant.now()));
            log.warn(
                "NotificationRequested retry exhausted, moved to DLQ eventId={} correlationId={} attempts={}",
                eventId,
                correlationId,
                attempt
            );
            return;
        }

        publishToRetry(rawMessage, nextAttempt, ex, correlationId);
        channel.basicAck(deliveryTag, false);
        metrics.recordConsume("retry", Duration.between(startedAt, Instant.now()));
        log.warn(
            "NotificationRequested scheduled for retry eventId={} correlationId={} attempt={} maxRetries={} reason={}",
            eventId,
            correlationId,
            nextAttempt,
            properties.getAsync().getMaxRetries(),
            extractFailureReason(ex)
        );
    }

    private NotificationRequested decodeAndValidate(Message rawMessage) {
        try {
            NotificationRequested message = objectMapper.readValue(rawMessage.getBody(), NotificationRequested.class);
            if (message.eventVersion() == null) {
                throw new PermanentNotificationMessageException("MISSING_EVENT_VERSION", "eventVersion is required");
            }
            if (message.eventVersion() != 1) {
                throw new PermanentNotificationMessageException(
                    "UNSUPPORTED_EVENT_VERSION",
                    "Unsupported eventVersion " + message.eventVersion()
                );
            }
            if (message.eventId() == null) {
                throw new PermanentNotificationMessageException("MISSING_EVENT_ID", "eventId is required");
            }
            if (message.eventType() == null) {
                throw new PermanentNotificationMessageException("MISSING_EVENT_TYPE", "eventType is required");
            }
            if (message.occurredAt() == null) {
                throw new PermanentNotificationMessageException("MISSING_OCCURRED_AT", "occurredAt is required");
            }
            if (message.targetUserIds() == null || message.targetUserIds().isEmpty()) {
                throw new PermanentNotificationMessageException("MISSING_TARGET_USERS", "targetUserIds must not be empty");
            }
            if (message.targetUserIds().size() > properties.getAsync().getMaxTargetUserIds()) {
                throw new PermanentNotificationMessageException(
                    "TARGET_USER_LIMIT_EXCEEDED",
                    "targetUserIds size exceeds configured limit"
                );
            }
            for (UUID targetUserId : message.targetUserIds()) {
                if (targetUserId == null) {
                    throw new PermanentNotificationMessageException(
                        "INVALID_TARGET_USER",
                        "targetUserIds must not contain null values"
                    );
                }
            }
            if (message.metadata() != null) {
                int metadataBytes = objectMapper.writeValueAsBytes(message.metadata()).length;
                if (metadataBytes > properties.getAsync().getMaxMetadataBytes()) {
                    throw new PermanentNotificationMessageException(
                        "METADATA_TOO_LARGE",
                        "metadata exceeds configured byte limit"
                    );
                }
            }
            return message;
        } catch (PermanentNotificationMessageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PermanentNotificationMessageException(
                "INVALID_PAYLOAD",
                "Failed to decode NotificationRequested payload",
                ex
            );
        }
    }

    private void publishToRetry(Message original, int nextAttempt, Exception ex, String correlationId) {
        long delayMillis = resolveBackoffMillis(nextAttempt);
        MessageProperties propertiesCopy = MessagePropertiesBuilder
            .fromClonedProperties(original.getMessageProperties())
            .build();
        Message retryMessage = MessageBuilder
            .withBody(original.getBody())
            .andProperties(propertiesCopy)
            .setHeader("x-retry-count", nextAttempt)
            .setHeader("x-attempt-count", nextAttempt)
            .setHeader("x-last-failure-reason", extractFailureReason(ex))
            .setHeader("x-last-exception-class", ex.getClass().getName())
            .setHeaderIfAbsent("x-first-failure-at", Instant.now().toString())
            .setHeaderIfAbsent("x-correlation-id", correlationId)
            .setExpiration(Long.toString(delayMillis))
            .build();
        rabbitTemplate.send(properties.getAsync().getExchange(), properties.getAsync().getRetryRoutingKey(), retryMessage);
    }

    private void publishToDlq(
        Message original,
        int retryCount,
        Exception ex,
        String failureReason,
        String correlationId
    ) {
        Map<String, Object> headers = new LinkedHashMap<>(original.getMessageProperties().getHeaders());
        headers.put("x-failure-reason", failureReason + ":" + extractFailureReason(ex));
        headers.put("x-exception-class", ex.getClass().getName());
        headers.put("x-attempt-count", retryCount);
        headers.put("x-original-exchange", original.getMessageProperties().getReceivedExchange());
        headers.put("x-original-routing-key", original.getMessageProperties().getReceivedRoutingKey());
        headers.put("x-correlation-id", correlationId);
        headers.putIfAbsent("x-first-failure-at", Instant.now().toString());
        headers.put("x-last-failure-at", Instant.now().toString());

        MessageProperties propertiesCopy = MessagePropertiesBuilder
            .fromClonedProperties(original.getMessageProperties())
            .build();
        Message dlqMessage = MessageBuilder
            .withBody(original.getBody())
            .andProperties(propertiesCopy)
            .copyHeaders(headers)
            .build();
        rabbitTemplate.send(properties.getAsync().getDlx(), properties.getAsync().getDlqRoutingKey(), dlqMessage);
        metrics.recordDlqPublish();
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
        if (properties.getAsync().getRetryBackoffMillis().isEmpty()) {
            return 1000L;
        }
        int index = Math.max(0, Math.min(nextAttempt - 1, properties.getAsync().getRetryBackoffMillis().size() - 1));
        return properties.getAsync().getRetryBackoffMillis().get(index);
    }

    private static String extractFailureReason(Exception ex) {
        if (ex instanceof PermanentNotificationMessageException permanent && permanent.reason() != null) {
            return permanent.reason();
        }
        return ex.getClass().getSimpleName();
    }

    private static String resolveCorrelationId(NotificationRequested message, Message rawMessage) {
        if (message != null && message.correlationId() != null && !message.correlationId().isBlank()) {
            return message.correlationId();
        }
        Object value = rawMessage.getMessageProperties().getHeaders().get("x-correlation-id");
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue;
        }
        return null;
    }

    private static void restoreCorrelation(String previousCorrelationId) {
        if (previousCorrelationId == null || previousCorrelationId.isBlank()) {
            MDC.remove("correlationId");
            return;
        }
        MDC.put("correlationId", previousCorrelationId);
    }
}
