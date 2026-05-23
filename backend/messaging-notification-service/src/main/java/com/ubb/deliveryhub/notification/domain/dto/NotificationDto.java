package com.ubb.deliveryhub.notification.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class NotificationDto {
    String id;
    String type;
    String category;
    String title;
    String message;
    String deliveryId;
    Instant createdAt;
    boolean read;
    Instant readAt;
}
