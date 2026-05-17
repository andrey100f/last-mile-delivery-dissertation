package com.ubb.deliveryhub.admin.reports.api.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminExceptionsReportDto {
    ReportWindowDto window;
    long totalExceptions;
    List<String> exceptionTypes;
    List<ReportExceptionBucketDto> buckets;
}
