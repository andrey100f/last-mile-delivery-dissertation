package com.ubb.deliveryhub.courier.api.dto.earnings;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;

@Value
@Builder
public class CourierEarningsChartPointDto {
    Instant bucketStart;
    Instant bucketEnd;
    BigDecimal total;
}
