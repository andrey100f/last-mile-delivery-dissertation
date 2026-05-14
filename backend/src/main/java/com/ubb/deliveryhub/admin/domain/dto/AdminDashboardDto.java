package com.ubb.deliveryhub.admin.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;

@Value
@Builder
public class AdminDashboardDto {
    long activeDeliveriesCount;
    long couriersOnlineCount;
    BigDecimal revenueTotal;
    String revenueCurrency;
    long exceptionBacklogCount;
    Instant generatedAt;
    AdminDashboardWindowDto window;
}
