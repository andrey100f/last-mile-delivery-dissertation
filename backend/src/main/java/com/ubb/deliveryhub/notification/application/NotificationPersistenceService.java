package com.ubb.deliveryhub.notification.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.repository.UserRepository;
import com.ubb.deliveryhub.notification.domain.Notification;
import com.ubb.deliveryhub.notification.events.NotificationRequested;
import com.ubb.deliveryhub.notification.repository.NotificationRepository;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationPersistenceService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public NotificationPersistenceService(
        NotificationRepository notificationRepository,
        UserRepository userRepository,
        EntityManager entityManager,
        ObjectMapper objectMapper
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    @Transactional
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
        payload.put("eventId", event.eventId());
        payload.put("eventType", event.eventType());
        payload.put("status", event.status());
        payload.put("occurredAt", event.occurredAt());
        payload.put("actorUserId", event.actorUserId());
        payload.put("metadata", event.metadata());
        notification.setPayloadJson(objectMapper.valueToTree(payload));
        try {
            notificationRepository.save(notification);
            return true;
        } catch (DataIntegrityViolationException ex) {
            return false;
        }
    }

    private User requireUserReference(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Notification target user not found: " + userId);
        }
        return entityManager.getReference(User.class, userId);
    }

    private Delivery optionalDeliveryReference(UUID deliveryId) {
        if (deliveryId == null) {
            return null;
        }
        return entityManager.find(Delivery.class, deliveryId);
    }
}
