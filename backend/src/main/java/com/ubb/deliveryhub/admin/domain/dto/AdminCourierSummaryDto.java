package com.ubb.deliveryhub.admin.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminCourierSummaryDto {
    long totalCouriers;
    long activeNow;
    long totalDeliveries;
}
