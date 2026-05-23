package com.ubb.deliveryhub.notification.service;

import com.ubb.deliveryhub.notification.domain.Notification;
import com.ubb.deliveryhub.notification.domain.dto.NotificationDto;

public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationDto toDto(Notification notification) {
        return NotificationDto.builder()
            .id(notification.getId().toString())
            .type(notification.getType().name())
            .category(notification.getCategory().name())
            .title(notification.getTitle())
            .message(notification.getMessage())
            .deliveryId(notification.getDelivery() != null ? notification.getDelivery().getId().toString() : null)
            .createdAt(notification.getCreatedAt())
            .read(notification.getReadAt() != null)
            .readAt(notification.getReadAt())
            .build();
    }
}
