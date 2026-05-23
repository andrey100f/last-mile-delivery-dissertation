package com.ubb.deliveryhub.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "services")
public record ServiceUrlsProperties(
    String identity,
    String delivery,
    String courier,
    String events,
    String notification,
    String tracking,
    String admin
) {
}
