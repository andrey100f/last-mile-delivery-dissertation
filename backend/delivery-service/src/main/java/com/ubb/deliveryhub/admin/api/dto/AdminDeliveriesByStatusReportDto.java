package com.ubb.deliveryhub.admin.reports.api.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminDeliveriesByStatusReportDto {
    ReportWindowDto window;
    long totalStatusEvents;
    List<String> statuses;
    List<ReportBucketStatusDto> buckets;
}
