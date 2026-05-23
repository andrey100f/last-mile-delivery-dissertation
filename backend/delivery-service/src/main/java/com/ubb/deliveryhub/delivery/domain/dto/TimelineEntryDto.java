package com.ubb.deliveryhub.delivery.domain.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class TimelineEntryDto {
    String status;
    Instant recordedAt;
    String note;
}
