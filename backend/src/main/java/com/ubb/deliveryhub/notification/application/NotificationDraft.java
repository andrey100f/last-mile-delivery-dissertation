package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.notification.domain.NotificationCategory;
import com.ubb.deliveryhub.notification.domain.NotificationType;

public record NotificationDraft(
    NotificationType type,
    NotificationCategory category,
    String title,
    String message
) {
}
