package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.notification.events.NotificationRequested;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class SpringNotificationEventPublisher implements NotificationEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public SpringNotificationEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
        this.applicationEventPublisher = applicationEventPublisher;
    }

    @Override
    public void publish(NotificationRequested event) {
        applicationEventPublisher.publishEvent(event);
    }
}
