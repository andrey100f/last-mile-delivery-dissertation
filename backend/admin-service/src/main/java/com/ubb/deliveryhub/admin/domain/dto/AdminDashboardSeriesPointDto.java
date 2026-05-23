package com.ubb.deliveryhub.admin.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminDashboardSeriesPointDto {
    String label;
    long value;
}
