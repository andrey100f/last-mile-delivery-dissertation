package com.ubb.deliveryhub.notification.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class MarkAllReadResponse {
    int updatedCount;
}
