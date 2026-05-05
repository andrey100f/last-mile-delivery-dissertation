package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.identity.domain.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class DeliverySpecifications {

    private DeliverySpecifications() {
    }

    /**
     * Scope to one customer; optional exact status (dashboard / history filters).
     * Explicit inner join on customer matches {@code (customer_id, status)} index usage.
     */
    public static Specification<Delivery> forCustomerWithOptionalStatus(UUID customerId, DeliveryStatus status) {
        return (root, query, cb) -> {
            Join<Delivery, User> customerJoin = root.join("customer", JoinType.INNER);
            var byCustomer = cb.equal(customerJoin.get("id"), customerId);
            if (status == null) {
                return byCustomer;
            }
            return cb.and(byCustomer, cb.equal(root.get("status"), status));
        };
    }
}
