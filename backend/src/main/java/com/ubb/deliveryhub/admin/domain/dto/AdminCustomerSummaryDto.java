package com.ubb.deliveryhub.admin.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class AdminCustomerSummaryDto {
    long totalCustomers;
    BigDecimal totalRevenue;
    String revenueCurrency;
}
