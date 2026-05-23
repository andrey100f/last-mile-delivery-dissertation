package com.ubb.deliveryhub.courier.api.dto.earnings;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class CourierEarningsTrendDto {
    BigDecimal previousPeriodTotal;
    BigDecimal deltaAmount;
    BigDecimal deltaPercent;
}
