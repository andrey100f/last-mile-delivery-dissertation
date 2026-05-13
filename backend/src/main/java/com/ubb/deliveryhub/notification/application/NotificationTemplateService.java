package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.notification.domain.NotificationCategory;
import com.ubb.deliveryhub.notification.domain.NotificationType;
import com.ubb.deliveryhub.notification.events.NotificationEventType;
import com.ubb.deliveryhub.notification.events.NotificationRequested;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class NotificationTemplateService {

    public NotificationDraft render(NotificationRequested event, UUID recipientUserId) {
        return switch (event.eventType()) {
            case ASSIGNMENT_ACCEPTED -> assignmentAccepted(event, recipientUserId);
            case STATUS_UPDATED -> statusUpdated(event);
            case EXCEPTION_REPORTED -> exceptionReported(event);
        };
    }

    private static NotificationDraft assignmentAccepted(NotificationRequested event, UUID recipientUserId) {
        boolean actorIsRecipient = event.actorUserId().equals(recipientUserId);
        String title = actorIsRecipient ? "Delivery assignment confirmed" : "Courier assigned";
        String message = actorIsRecipient
            ? "You are now assigned to delivery %s.".formatted(shortDeliveryCode(event.deliveryId()))
            : "Your delivery %s was accepted by a courier.".formatted(shortDeliveryCode(event.deliveryId()));
        return new NotificationDraft(NotificationType.DELIVERY_ASSIGNED, NotificationCategory.DELIVERY, title, message);
    }

    private static NotificationDraft statusUpdated(NotificationRequested event) {
        DeliveryStatus status = event.status();
        String statusLabel = status == null ? "updated" : status.name().replace('_', ' ');
        String title = "Delivery status updated";
        String message = "Delivery %s is now %s.".formatted(shortDeliveryCode(event.deliveryId()), statusLabel);
        return new NotificationDraft(NotificationType.STATUS_UPDATED, NotificationCategory.DELIVERY, title, message);
    }

    private static NotificationDraft exceptionReported(NotificationRequested event) {
        String title = "Delivery exception reported";
        String message = "An exception was reported for delivery %s.".formatted(shortDeliveryCode(event.deliveryId()));
        return new NotificationDraft(NotificationType.EXCEPTION_REPORTED, NotificationCategory.EXCEPTION, title, message);
    }

    private static String shortDeliveryCode(UUID deliveryId) {
        String raw = deliveryId.toString().replace("-", "");
        return "DH-" + raw.substring(0, Math.min(8, raw.length())).toUpperCase();
    }
}
