package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Minimal courier info for delivery detail from {@link com.ubb.deliveryhub.common.domain.User}.
 */
@Value
@Builder
public class CourierSummaryDto {
    String id;
    String displayName;
    String phone;
}
