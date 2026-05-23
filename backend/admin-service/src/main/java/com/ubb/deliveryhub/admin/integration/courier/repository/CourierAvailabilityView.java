package com.ubb.deliveryhub.admin.integration.courier.repository;

import java.util.UUID;

public interface CourierAvailabilityView {
    UUID getUserId();

    boolean isAvailableNow();
}
