package com.ubb.deliveryhub.admin.reports.infrastructure.row;

import java.time.Instant;

public record ExceptionAggregateRow(
    Instant bucketStart,
    String notificationType,
    long count
) {
}
