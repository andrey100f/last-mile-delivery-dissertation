package com.ubb.deliveryhub.courier.api.dto.earnings;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class CourierEarningsSummaryDto {
    String currency;
    BigDecimal todayTotal;
    BigDecimal weekTotal;
    BigDecimal monthTotal;
    BigDecimal customRangeTotal;
    CourierEarningsTrendDto trend;
    CourierEarningsWindowDto window;
    List<CourierEarningsChartPointDto> chartPoints;
}
