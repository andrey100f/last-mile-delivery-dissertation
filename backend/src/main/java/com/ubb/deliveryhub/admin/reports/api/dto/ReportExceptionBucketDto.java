package com.ubb.deliveryhub.admin.reports.api.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.Map;

@Value
@Builder
public class ReportExceptionBucketDto {
    Instant bucketStart;
    Instant bucketEnd;
    Map<String, Long> countsByType;
    long total;
}
