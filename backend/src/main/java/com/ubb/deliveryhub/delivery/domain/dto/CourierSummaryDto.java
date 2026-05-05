package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Minimal courier info for delivery detail; {@link com.ubb.deliveryhub.identity.domain.User}
 * currently exposes email only (no phone on account) — phone is null until profiles exist.
 */
@Value
@Builder
public class CourierSummaryDto {
    String id;
    String displayName;
    String phone;
}
