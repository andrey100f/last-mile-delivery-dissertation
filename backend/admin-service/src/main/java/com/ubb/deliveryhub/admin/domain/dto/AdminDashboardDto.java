package com.ubb.deliveryhub.admin.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

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
    List<AdminDashboardSeriesPointDto> deliveryVolumeSeries;
    List<AdminDashboardSeriesPointDto> statusDistributionSeries;
}
