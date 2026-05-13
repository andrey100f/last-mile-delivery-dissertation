package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.notification.events.NotificationRequested;

public interface NotificationEventPublisher {

    void publish(NotificationRequested event);
}
