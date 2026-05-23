package com.ubb.deliveryhub.delivery.repository;

import java.util.UUID;

public interface CourierDeliveriesCountView {
    UUID getCourierId();

    long getDeliveriesCount();
}
