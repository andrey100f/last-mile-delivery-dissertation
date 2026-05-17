package com.ubb.deliveryhub.admin.reports.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class AdminRevenueReportDto {
    ReportWindowDto window;
    BigDecimal totalRevenue;
    String currency;
    long deliveredCount;
    List<ReportRevenueBucketDto> buckets;
}
