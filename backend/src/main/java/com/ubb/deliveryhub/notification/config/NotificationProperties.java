package com.ubb.deliveryhub.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "notifications")
public class NotificationProperties {

    private final Async async = new Async();

    public Async getAsync() {
        return async;
    }

    public static class Async {

        private boolean enabled = false;
        private boolean fallbackToSync = true;
        private String exchange = "deliveryhub.notifications";
        private String routingKey = "requested";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isFallbackToSync() {
            return fallbackToSync;
        }

        public void setFallbackToSync(boolean fallbackToSync) {
            this.fallbackToSync = fallbackToSync;
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
    }
}
