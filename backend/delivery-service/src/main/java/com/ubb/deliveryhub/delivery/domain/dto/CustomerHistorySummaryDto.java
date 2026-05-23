package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class CustomerHistorySummaryDto {
    long totalDeliveries;
    long deliveredDeliveries;
    BigDecimal totalSpent;
    String totalSpentCurrency;
}
