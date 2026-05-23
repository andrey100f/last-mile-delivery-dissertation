package com.ubb.deliveryhub.notification.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ubb.deliveryhub.notification.integration.delivery.Delivery;
import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.notification.domain.Notification;
import com.ubb.deliveryhub.notification.domain.id.NotificationId;
import com.ubb.deliveryhub.common.messaging.NotificationRequested;
import com.ubb.deliveryhub.notification.repository.NotificationRepository;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationPersistenceService {

    private final NotificationRepository notificationRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public NotificationPersistenceService(
        NotificationRepository notificationRepository,
        EntityManager entityManager,
        ObjectMapper objectMapper
    ) {
        this.notificationRepository = notificationRepository;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean persist(NotificationRequested event, UUID recipientUserId, NotificationDraft draft, String dedupeKey) {
        Notification notification = new Notification();
        notification.setUser(requireUserReference(recipientUserId));
        notification.setDelivery(optionalDeliveryReference(event.deliveryId()));
        notification.setType(draft.type());
        notification.setCategory(draft.category());
        notification.setTitle(draft.title());
        notification.setMessage(draft.message());
        notification.setDedupeKey(dedupeKey);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventVersion", event.eventVersion());
        payload.put("eventId", event.eventId() != null ? event.eventId().toString() : null);
        payload.put("correlationId", event.correlationId());
        payload.put("eventType", event.eventType() != null ? event.eventType().name() : null);
        payload.put("status", event.status() != null ? event.status().name() : null);
        // Store as ISO-8601 text to avoid runtime mapper module mismatch for java.time types.
        payload.put("occurredAt", event.occurredAt() != null ? event.occurredAt().toString() : null);
        payload.put("actorUserId", event.actorUserId() != null ? event.actorUserId().toString() : null);
        payload.put("metadata", event.metadata());
        notification.setPayloadJson(objectMapper.valueToTree(payload));
        try {
            notificationRepository.save(notification);
            return true;
        } catch (DataIntegrityViolationException ex) {
            if (isDedupeViolation(ex)) {
                return false;
            }
            throw ex;
        }
    }

    private User requireUserReference(UUID userId) {
        return entityManager.getReference(User.class, userId);
    }

    private Delivery optionalDeliveryReference(UUID deliveryId) {
        if (deliveryId == null) {
            return null;
        }
        return entityManager.getReference(Delivery.class, deliveryId);
    }

    private static boolean isDedupeViolation(Throwable throwable) {
        Throwable cursor = throwable;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase();
                if (normalized.contains(NotificationId.IDX_DEDUPE_KEY) || normalized.contains(NotificationId.DEDUPE_KEY)) {
                    return true;
                }
            }
            cursor = cursor.getCause();
        }
        return false;
    }
}
