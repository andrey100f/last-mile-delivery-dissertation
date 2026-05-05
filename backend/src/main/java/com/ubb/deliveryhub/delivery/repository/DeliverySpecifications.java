package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class DeliverySpecifications {

    private DeliverySpecifications() {
    }

    /**
     * Scope to one customer; optional exact status (dashboard / history filters).
     */
    public static Specification<Delivery> forCustomerWithOptionalStatus(UUID customerId, DeliveryStatus status) {
        return (root, query, cb) -> {
            var byCustomer = cb.equal(root.get("customer").get("id"), customerId);
            if (status == null) {
                return byCustomer;
            }
            return cb.and(byCustomer, cb.equal(root.get("status"), status));
        };
    }
}
