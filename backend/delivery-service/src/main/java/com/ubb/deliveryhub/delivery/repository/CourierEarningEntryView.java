package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface CourierEarningEntryView {

    UUID getDeliveryId();

    String getTrackingCode();

    BigDecimal getTotalAmount();

    String getCurrency();

    DeliveryStatus getStatus();

    Instant getRecordedAt();

    String getNote();
}
