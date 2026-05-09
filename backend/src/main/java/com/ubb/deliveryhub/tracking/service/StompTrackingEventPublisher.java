package com.ubb.deliveryhub.tracking.service;

import com.ubb.deliveryhub.tracking.api.dto.TrackingStatusEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class StompTrackingEventPublisher implements TrackingEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(StompTrackingEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public StompTrackingEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void publish(TrackingStatusEvent event) {
        String destination = "/topic/deliveries/" + event.deliveryId() + "/tracking";
        messagingTemplate.convertAndSend(destination, event);
        log.debug("Published tracking status event for deliveryId={} destination={}", event.deliveryId(), destination);
    }
}
