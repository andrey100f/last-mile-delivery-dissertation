package com.ubb.deliveryhub.notification.infrastructure.async;

import com.ubb.deliveryhub.notification.events.NotificationRequested;

public interface NotificationAsyncPublisher {

    void publish(NotificationRequested event);
}
