package com.ubb.deliveryhub.courier.api.dto.earnings;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class CourierEarningsWindowDto {
    Instant from;
    Instant to;
    String timezone;
    long maxRangeDays;
}
