package com.ubb.deliveryhub.delivery.api;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryNotFoundException;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/internal/deliveries")
@RequiredArgsConstructor
public class InternalDeliveryAccessController {

    private final DeliveryRepository deliveryRepository;

    @GetMapping("/{deliveryId}/access")
    public DeliveryAccessResponse getAccess(@PathVariable UUID deliveryId) {
        var delivery = deliveryRepository.findWithCustomerAndCourierById(deliveryId)
            .orElseThrow(DeliveryNotFoundException::new);
        UUID courierId = delivery.getCourier() != null ? delivery.getCourier().getId() : null;
        return new DeliveryAccessResponse(
            delivery.getCustomer().getId(),
            courierId,
            delivery.getStatus()
        );
    }

    public record DeliveryAccessResponse(UUID customerId, UUID courierId, DeliveryStatus status) {
    }
}
