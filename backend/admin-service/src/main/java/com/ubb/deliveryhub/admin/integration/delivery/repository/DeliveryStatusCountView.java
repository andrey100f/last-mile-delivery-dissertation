package com.ubb.deliveryhub.admin.integration.delivery.repository;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;

public interface DeliveryStatusCountView {
    DeliveryStatus getStatus();

    long getMetricValue();
}
