package com.ubb.deliveryhub.admin.reports.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;

@Value
@Builder
public class ReportRevenueBucketDto {
    Instant bucketStart;
    Instant bucketEnd;
    long deliveredCount;
    BigDecimal revenue;
}
