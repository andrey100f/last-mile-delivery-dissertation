package com.ubb.deliveryhub.delivery.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "delivery.assignment.async")
public class AsyncAssignmentProperties {

    private boolean enabled = false;
    private boolean consumerEnabled = false;
    private int maxRetries = 5;
    private String exchange = "delivery.events";
    private String routingKey = "delivery.created";
    private String queue = "delivery.assign.async.q";
    private String retryQueue = "delivery.assign.async.retry.q";
    private String retryRoutingKey = "delivery.created.retry";
    private String dlx = "delivery.assign.async.dlx";
    private String dlq = "delivery.assign.async.dlq";
    private String dlqRoutingKey = "delivery.created.dlq";
    private List<Long> retryBackoffMillis = new ArrayList<>(List.of(1000L, 3000L, 10000L, 30000L, 60000L));

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

    public int getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
        this.maxRetries = Math.max(0, maxRetries);
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

    public List<Long> getRetryBackoffMillis() {
        return retryBackoffMillis;
    }

    public void setRetryBackoffMillis(List<Long> retryBackoffMillis) {
        if (retryBackoffMillis == null || retryBackoffMillis.isEmpty()) {
            this.retryBackoffMillis = new ArrayList<>(List.of(1000L));
            return;
        }
        this.retryBackoffMillis = new ArrayList<>(retryBackoffMillis);
    }
}
