package com.ubb.deliveryhub.admin.reports.infrastructure.row;

import java.math.BigDecimal;
import java.time.Instant;

public record RevenueAggregateRow(
    Instant bucketStart,
    long deliveredCount,
    BigDecimal revenue
) {
}
