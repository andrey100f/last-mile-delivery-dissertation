package com.ubb.deliveryhub.admin.integration.delivery.repository;

import java.util.UUID;

public interface CourierDeliveriesCountView {
    UUID getCourierId();

    long getDeliveriesCount();
}
