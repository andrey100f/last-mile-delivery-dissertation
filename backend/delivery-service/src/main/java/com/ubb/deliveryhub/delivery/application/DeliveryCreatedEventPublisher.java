package com.ubb.deliveryhub.delivery.application;

import com.ubb.deliveryhub.common.messaging.DeliveryCreatedMessage;

public interface DeliveryCreatedEventPublisher {

    void publish(DeliveryCreatedMessage message);
}
