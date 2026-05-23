package com.ubb.deliveryhub.common.client;

import com.ubb.deliveryhub.common.config.ServiceUrlsProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Component
public class CourierServiceClient {

    private final RestClient restClient;

    public CourierServiceClient(RestClient.Builder restClientBuilder, ServiceUrlsProperties serviceUrls) {
        this.restClient = restClientBuilder.baseUrl(serviceUrls.courier()).build();
    }

    public CourierProfileSnapshot getProfile(UUID courierUserId) {
        try {
            return restClient.get()
                .uri("/internal/couriers/{userId}/profile", courierUserId)
                .retrieve()
                .body(CourierProfileSnapshot.class);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public AssignCourierResponse assignNextCourier(boolean requiresExpress) {
        return restClient.post()
            .uri("/internal/couriers/assign-next")
            .body(Map.of("requiresExpress", requiresExpress))
            .retrieve()
            .body(AssignCourierResponse.class);
    }

    public record CourierProfileSnapshot(
        UUID userId,
        boolean availableNow,
        boolean expressCapable
    ) {
    }

    public record AssignCourierResponse(UUID courierUserId) {
    }
}
