package com.ubb.deliveryhub.admin.integration.delivery.repository;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Read projection used by polling status endpoint to avoid loading full delivery aggregate.
 */
public interface DeliveryStatusSnapshotView {
    DeliveryStatus getStatus();

    Instant getUpdatedAt();

    UUID getCustomerId();

    UUID getCourierId();
}
