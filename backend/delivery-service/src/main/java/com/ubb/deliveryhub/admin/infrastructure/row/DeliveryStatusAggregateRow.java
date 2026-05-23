package com.ubb.deliveryhub.admin.reports.infrastructure.row;

import java.time.Instant;

public record DeliveryStatusAggregateRow(
    Instant bucketStart,
    String status,
    long count
) {
}
