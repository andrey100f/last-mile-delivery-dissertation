package com.ubb.deliveryhub.courier.repository;

import java.util.UUID;

public interface CourierAvailabilityView {
    UUID getUserId();

    boolean isAvailableNow();
}
