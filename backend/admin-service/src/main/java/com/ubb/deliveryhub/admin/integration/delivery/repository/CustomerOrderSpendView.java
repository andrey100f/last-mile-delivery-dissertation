package com.ubb.deliveryhub.admin.integration.delivery.repository;

import java.math.BigDecimal;
import java.util.UUID;

public interface CustomerOrderSpendView {
    UUID getCustomerId();

    long getOrdersCount();

    BigDecimal getTotalSpend();
}
