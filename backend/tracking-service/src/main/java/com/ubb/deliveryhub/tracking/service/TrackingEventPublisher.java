package com.ubb.deliveryhub.tracking.service;

import com.ubb.deliveryhub.tracking.api.dto.TrackingStatusEvent;

public interface TrackingEventPublisher {

    void publish(TrackingStatusEvent event);
}
