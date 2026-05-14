package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;

public interface DeliveryStatusCountView {
    DeliveryStatus getStatus();

    long getMetricValue();
}
