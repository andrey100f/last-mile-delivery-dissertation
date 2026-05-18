package com.ubb.deliveryhub.notification.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Validated
@ConfigurationProperties(prefix = "notifications")
public class NotificationProperties {

    @Valid
    private final Async async = new Async();

    public Async getAsync() {
        return async;
    }

    public static class Async {

        private boolean enabled = false;
        private boolean consumerEnabled = false;
        private boolean fallbackToSync = true;
        @Min(0)
        private int maxRetries = 5;
        @Min(1)
        private int maxTargetUserIds = 100;
        @Min(256)
        private int maxMetadataBytes = 8192;
        @NotBlank
        private String exchange = "notification.events";
        @NotBlank
        private String routingKey = "notification.requested";
        @NotBlank
        private String queue = "notification.consume.q";
        @NotBlank
        private String retryQueue = "notification.consume.retry.q";
        @NotBlank
        private String retryRoutingKey = "notification.requested.retry";
        @NotBlank
        private String dlx = "notification.consume.dlx";
        @NotBlank
        private String dlq = "notification.consume.dlq";
        @NotBlank
        private String dlqRoutingKey = "notification.requested.dlq";
        @NotEmpty
        private List<@Min(1) Long> retryBackoffMillis = new ArrayList<>(List.of(1000L, 3000L, 10000L, 30000L, 60000L));

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isConsumerEnabled() {
            return consumerEnabled;
        }

        public void setConsumerEnabled(boolean consumerEnabled) {
            this.consumerEnabled = consumerEnabled;
        }

        public boolean isFallbackToSync() {
            return fallbackToSync;
        }

        public void setFallbackToSync(boolean fallbackToSync) {
            this.fallbackToSync = fallbackToSync;
        }

        public int getMaxRetries() {
            return maxRetries;
        }

        public void setMaxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
        }

        public int getMaxTargetUserIds() {
            return maxTargetUserIds;
        }

        public void setMaxTargetUserIds(int maxTargetUserIds) {
            this.maxTargetUserIds = maxTargetUserIds;
        }

        public int getMaxMetadataBytes() {
            return maxMetadataBytes;
        }

        public void setMaxMetadataBytes(int maxMetadataBytes) {
            this.maxMetadataBytes = maxMetadataBytes;
        }

        public String getExchange() {
            return exchange;
        }

        public void setExchange(String exchange) {
            this.exchange = exchange;
        }

        public String getRoutingKey() {
            return routingKey;
        }

        public void setRoutingKey(String routingKey) {
            this.routingKey = routingKey;
        }

        public String getQueue() {
            return queue;
        }

        public void setQueue(String queue) {
            this.queue = queue;
        }

        public String getRetryQueue() {
            return retryQueue;
        }

        public void setRetryQueue(String retryQueue) {
            this.retryQueue = retryQueue;
        }

        public String getRetryRoutingKey() {
            return retryRoutingKey;
        }

        public void setRetryRoutingKey(String retryRoutingKey) {
            this.retryRoutingKey = retryRoutingKey;
        }

        public String getDlx() {
            return dlx;
        }

        public void setDlx(String dlx) {
            this.dlx = dlx;
        }

        public String getDlq() {
            return dlq;
        }

        public void setDlq(String dlq) {
            this.dlq = dlq;
        }

        public String getDlqRoutingKey() {
            return dlqRoutingKey;
        }

        public void setDlqRoutingKey(String dlqRoutingKey) {
            this.dlqRoutingKey = dlqRoutingKey;
        }

        public List<@Min(1) Long> getRetryBackoffMillis() {
            return retryBackoffMillis;
        }

        public void setRetryBackoffMillis(List<@Min(1) Long> retryBackoffMillis) {
            this.retryBackoffMillis = new ArrayList<>(retryBackoffMillis);
        }
    }
}
