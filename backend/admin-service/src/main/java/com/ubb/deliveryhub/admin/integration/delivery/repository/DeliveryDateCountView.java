package com.ubb.deliveryhub.admin.integration.delivery.repository;

import java.time.LocalDate;

public interface DeliveryDateCountView {
    LocalDate getBucketDate();

    long getMetricValue();
}
