package com.ubb.deliveryhub.admin.reports.api.dto;

import com.ubb.deliveryhub.admin.reports.domain.ReportGranularity;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class ReportWindowDto {
    Instant from;
    Instant to;
    String timezone;
    ReportGranularity granularity;
    long maxRangeDays;
}
