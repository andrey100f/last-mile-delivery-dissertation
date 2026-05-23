package com.ubb.deliveryhub.common.client;

import com.ubb.deliveryhub.common.config.ServiceUrlsProperties;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

@Component
public class DeliveryAccessClient {

    private final RestClient restClient;

    public DeliveryAccessClient(RestClient.Builder restClientBuilder, ServiceUrlsProperties serviceUrls) {
        this.restClient = restClientBuilder.baseUrl(serviceUrls.delivery()).build();
    }

    public DeliveryAccessSnapshot getAccessSnapshot(UUID deliveryId) {
        try {
            return restClient.get()
                .uri("/internal/deliveries/{deliveryId}/access", deliveryId)
                .retrieve()
                .body(DeliveryAccessSnapshot.class);
        } catch (RestClientException ex) {
            return null;
        }
    }

    public record DeliveryAccessSnapshot(UUID customerId, UUID courierId, DeliveryStatus status) {
    }
}
