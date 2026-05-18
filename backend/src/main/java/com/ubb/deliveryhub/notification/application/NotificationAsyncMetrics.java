package com.ubb.deliveryhub.notification.application;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class NotificationAsyncMetrics {

    private final MeterRegistry meterRegistry;

    public NotificationAsyncMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordConsume(String outcome, Duration duration) {
        meterRegistry.counter("notification.async.consume", "outcome", outcome).increment();
        meterRegistry.timer("notification.async.process.duration", "outcome", outcome).record(duration);
    }

    public void recordDlqPublish() {
        meterRegistry.counter("notification.async.dlq.publish").increment();
    }
}
