package com.ubb.deliveryhub.delivery.repository;

import java.time.LocalDate;

public interface DeliveryDateCountView {
    LocalDate getBucketDate();

    long getMetricValue();
}
