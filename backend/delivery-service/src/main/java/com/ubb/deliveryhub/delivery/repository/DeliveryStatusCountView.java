package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

public interface DeliveryStatusCountView {
    DeliveryStatus getStatus();

    long getMetricValue();
}
