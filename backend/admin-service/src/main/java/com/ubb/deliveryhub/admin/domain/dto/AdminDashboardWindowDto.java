package com.ubb.deliveryhub.admin.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class AdminDashboardWindowDto {
    Instant from;
    Instant to;
    String timezone;
}
