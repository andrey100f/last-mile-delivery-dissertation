package com.ubb.deliveryhub.events.api;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.events.application.SystemEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/internal/events")
@RequiredArgsConstructor
public class InternalEventsController {

    private final SystemEventService systemEventService;

    @PostMapping("/delivery-assigned")
    public void deliveryAssigned(@RequestBody DeliveryAssignedRequest request) {
        systemEventService.emitDeliveryAssigned(request.deliveryId(), request.actorUserId(), request.occurredAt());
    }

    @PostMapping("/delivery-status-changed")
    public void deliveryStatusChanged(@RequestBody DeliveryStatusChangedRequest request) {
        systemEventService.emitDeliveryStatusChanged(
            request.deliveryId(),
            request.actorUserId(),
            request.fromStatus() != null ? DeliveryStatus.valueOf(request.fromStatus()) : null,
            request.toStatus() != null ? DeliveryStatus.valueOf(request.toStatus()) : null,
            request.occurredAt()
        );
    }

    @PostMapping("/login-failed")
    public void loginFailed(@RequestBody LoginFailedRequest request) {
        systemEventService.emitLoginFailed(request.email(), request.requestedRole(), request.occurredAt());
    }

    public record DeliveryAssignedRequest(UUID deliveryId, UUID actorUserId, Instant occurredAt) {
    }

    public record DeliveryStatusChangedRequest(
        UUID deliveryId,
        UUID actorUserId,
        String fromStatus,
        String toStatus,
        Instant occurredAt
    ) {
    }

    public record LoginFailedRequest(String email, String requestedRole, Instant occurredAt) {
    }
}
