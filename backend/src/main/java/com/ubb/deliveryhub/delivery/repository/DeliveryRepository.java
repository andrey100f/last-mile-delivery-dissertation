package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID>, JpaSpecificationExecutor<Delivery> {

    boolean existsByCustomer_IdAndId(UUID customerId, UUID id);

    @EntityGraph(attributePaths = {"customer", "courier"})
    @Query("SELECT d FROM Delivery d WHERE d.id = :id")
    Optional<Delivery> findWithCustomerAndCourierById(@Param("id") UUID id);

    @Query("""
        SELECT
          d.status AS status,
          d.updatedAt AS updatedAt,
          d.customer.id AS customerId,
          c.id AS courierId
        FROM Delivery d
        LEFT JOIN d.courier c
        WHERE d.id = :id
        """)
    Optional<DeliveryStatusSnapshotView> findStatusSnapshotById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"customer", "courier"})
    @Query("SELECT d FROM Delivery d WHERE d.id = :id")
    Optional<Delivery> findWithCustomerAndCourierByIdForUpdate(@Param("id") UUID id);

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

    @Query("""
        SELECT d
        FROM Delivery d
        WHERE d.courier.id = :courierId
          AND d.status IN :statuses
        """)
    Page<Delivery> findActiveForCourier(
        @Param("courierId") UUID courierId,
        @Param("statuses") Set<DeliveryStatus> statuses,
        Pageable pageable
    );

    @Query("""
        SELECT COUNT(d)
        FROM Delivery d
        WHERE d.status IN :statuses
          AND d.createdAt >= :fromInclusive
          AND d.createdAt < :toExclusive
        """)
    long countByStatusesInCreatedWindow(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT COUNT(DISTINCT c.id)
        FROM Delivery d
        JOIN d.courier c
        WHERE d.status IN :statuses
          AND d.createdAt >= :fromInclusive
          AND d.createdAt < :toExclusive
        """)
    long countDistinctCouriersByStatusesInCreatedWindow(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT COALESCE(SUM(d.totalAmount), 0)
        FROM Delivery d
        WHERE d.status IN :statuses
          AND d.createdAt >= :fromInclusive
          AND d.createdAt < :toExclusive
        """)
    BigDecimal sumRevenueByStatusesInCreatedWindow(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT d.currency
        FROM Delivery d
        WHERE d.status IN :statuses
          AND d.createdAt >= :fromInclusive
          AND d.createdAt < :toExclusive
        GROUP BY d.currency
        ORDER BY COUNT(d) DESC
        """)
    List<String> findRevenueCurrenciesByStatusesInCreatedWindow(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );
}
