package com.ubb.deliveryhub.common.client;

import com.ubb.deliveryhub.common.config.ServiceUrlsProperties;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class EventsClient {

    private final RestClient restClient;

    public EventsClient(RestClient.Builder restClientBuilder, ServiceUrlsProperties serviceUrls) {
        this.restClient = restClientBuilder.baseUrl(serviceUrls.events()).build();
    }

    public void emitDeliveryAssigned(UUID deliveryId, UUID actorUserId, Instant occurredAt) {
        post("/internal/events/delivery-assigned", Map.of(
            "deliveryId", deliveryId,
            "actorUserId", actorUserId,
            "occurredAt", occurredAt
        ));
    }

    public void emitDeliveryStatusChanged(
        UUID deliveryId,
        UUID actorUserId,
        DeliveryStatus fromStatus,
        DeliveryStatus toStatus,
        Instant occurredAt
    ) {
        post("/internal/events/delivery-status-changed", Map.of(
            "deliveryId", deliveryId,
            "actorUserId", actorUserId,
            "fromStatus", fromStatus != null ? fromStatus.name() : null,
            "toStatus", toStatus != null ? toStatus.name() : null,
            "occurredAt", occurredAt
        ));
    }

    public void emitLoginFailed(String email, String requestedRole, Instant occurredAt) {
        post("/internal/events/login-failed", Map.of(
            "email", email,
            "requestedRole", requestedRole,
            "occurredAt", occurredAt
        ));
    }

    private void post(String path, Map<String, Object> body) {
        try {
            restClient.post()
                .uri(path)
                .body(body)
                .retrieve()
                .toBodilessEntity();
        } catch (RuntimeException ignored) {
            // best-effort, same semantics as SystemEventService.emitBestEffort
        }
    }
}
