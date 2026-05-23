package com.ubb.deliveryhub.delivery.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface CustomerOrderSpendView {
    UUID getCustomerId();

    long getOrdersCount();

    BigDecimal getTotalSpend();
}
