package com.ubb.deliveryhub.notification.infrastructure.async;

import com.ubb.deliveryhub.common.messaging.NotificationRequested;

public interface NotificationAsyncPublisher {

    void publish(NotificationRequested event);
}
