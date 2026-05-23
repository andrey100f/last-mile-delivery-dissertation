package com.ubb.deliveryhub.delivery.application;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AsyncAssignmentMetrics {

    private final MeterRegistry meterRegistry;

    public AsyncAssignmentMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordConsume(String outcome, Duration duration) {
        meterRegistry.counter("delivery.assign.async.consume", "outcome", outcome).increment();
        meterRegistry.timer("delivery.assign.async.duration", "outcome", outcome).record(duration);
    }

    public void recordRetryExhausted() {
        meterRegistry.counter("delivery.assign.async.retry.exhausted").increment();
    }
}
