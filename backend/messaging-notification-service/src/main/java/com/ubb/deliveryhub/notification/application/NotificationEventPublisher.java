package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.common.messaging.NotificationRequested;

public interface NotificationEventPublisher {

    void publish(NotificationRequested event);
}
