package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID>, JpaSpecificationExecutor<Delivery> {

    boolean existsByCustomer_IdAndId(UUID customerId, UUID id);

    @EntityGraph(attributePaths = {"customer", "courier"})
    @Query("SELECT d FROM Delivery d WHERE d.id = :id")
    Optional<Delivery> findWithCustomerAndCourierById(@Param("id") UUID id);

    @Query("""
        SELECT d
        FROM Delivery d
        WHERE d.courier IS NULL
          AND d.status IN :statuses
          AND (:deliveryType IS NULL OR d.deliveryType = :deliveryType)
        """)
    Page<Delivery> findAvailableForCourier(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("deliveryType") DeliveryType deliveryType,
        Pageable pageable
    );
}
