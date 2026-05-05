package com.ubb.deliveryhub.delivery.domain;

import java.math.BigDecimal;

/**
 * Immutable pricing result applied as the persisted snapshot on {@link Delivery}.
 */
public record MoneySnapshot(
    BigDecimal baseAmount,
    BigDecimal feeAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    String currency
) {
}
