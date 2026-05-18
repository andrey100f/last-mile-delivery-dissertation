package com.ubb.deliveryhub.events.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.events.domain.SystemEvent;
import com.ubb.deliveryhub.events.domain.SystemEventActorType;
import com.ubb.deliveryhub.events.domain.SystemEventTargetType;
import com.ubb.deliveryhub.events.domain.SystemEventType;
import com.ubb.deliveryhub.events.infrastructure.SystemEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Log4j2
public class SystemEventService {

    private final SystemEventRepository systemEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void emitDeliveryAssigned(UUID deliveryId, UUID actorUserId, Instant occurredAt) {
        Map<String, Object> metadata = Map.of(
            "source", "delivery.accept",
            "assignedBy", "courier"
        );
        emitBestEffort(
            SystemEventType.DELIVERY_ASSIGNED,
            SystemEventActorType.USER,
            actorUserId,
            SystemEventTargetType.DELIVERY,
            deliveryId,
            metadata,
            occurredAt
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void emitDeliveryStatusChanged(
        UUID deliveryId,
        UUID actorUserId,
        DeliveryStatus fromStatus,
        DeliveryStatus toStatus,
        Instant occurredAt
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("source", "delivery.status");
        metadata.put("fromStatus", fromStatus != null ? fromStatus.name() : null);
        metadata.put("toStatus", toStatus != null ? toStatus.name() : null);
        emitBestEffort(
            SystemEventType.DELIVERY_STATUS_CHANGED,
            SystemEventActorType.USER,
            actorUserId,
            SystemEventTargetType.DELIVERY,
            deliveryId,
            metadata,
            occurredAt
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void emitLoginFailed(String email, String requestedRole, Instant occurredAt) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("source", "auth.login");
        metadata.put("reason", "INVALID_CREDENTIALS");
        metadata.put("role", requestedRole);
        metadata.put("emailDomain", extractEmailDomain(email));
        emitBestEffort(
            SystemEventType.LOGIN_FAILED,
            SystemEventActorType.ANONYMOUS,
            null,
            SystemEventTargetType.AUTH,
            null,
            metadata,
            occurredAt
        );
    }

    private void emitBestEffort(
        SystemEventType type,
        SystemEventActorType actorType,
        UUID actorId,
        SystemEventTargetType targetType,
        UUID targetId,
        Map<String, Object> metadata,
        Instant occurredAt
    ) {
        try {
            SystemEvent event = new SystemEvent();
            event.setType(type);
            event.setActorType(actorType);
            event.setActorId(actorId);
            event.setTargetType(targetType);
            event.setTargetId(targetId);
            event.setMetadata(sanitizeMetadata(metadata));
            event.setCreatedAt(occurredAt != null ? occurredAt : Instant.now());
            systemEventRepository.save(event);
        } catch (RuntimeException ex) {
            log.warn("System event persistence failed for type {}", type, ex);
        }
    }

    private JsonNode sanitizeMetadata(Map<String, Object> metadata) {
        Map<String, Object> sanitized = new LinkedHashMap<>();
        if (metadata != null) {
            for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                if (entry.getKey() == null || entry.getKey().isBlank()) {
                    continue;
                }
                if (entry.getValue() == null) {
                    continue;
                }
                sanitized.put(entry.getKey(), entry.getValue());
            }
        }
        return objectMapper.valueToTree(sanitized);
    }

    private String extractEmailDomain(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        int atIndex = email.indexOf('@');
        if (atIndex < 0 || atIndex == email.length() - 1) {
            return null;
        }
        return email.substring(atIndex + 1).trim().toLowerCase();
    }
}
