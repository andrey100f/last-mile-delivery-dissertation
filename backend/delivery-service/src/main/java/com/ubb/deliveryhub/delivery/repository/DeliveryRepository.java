package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.common.domain.enums.DeliveryType;
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
    long countByCustomer_Id(UUID customerId);
    long countByCustomer_IdAndStatus(UUID customerId, DeliveryStatus status);

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
        ORDER BY COUNT(d) DESC, d.currency ASC
        """)
    List<String> findRevenueCurrenciesByStatusesInCreatedWindow(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT
          FUNCTION('date', FUNCTION('timezone', 'UTC', d.createdAt)) AS bucketDate,
          COUNT(d) AS metricValue
        FROM Delivery d
        WHERE d.status IN :statuses
          AND d.createdAt >= :fromInclusive
          AND d.createdAt < :toExclusive
        GROUP BY FUNCTION('date', FUNCTION('timezone', 'UTC', d.createdAt))
        ORDER BY FUNCTION('date', FUNCTION('timezone', 'UTC', d.createdAt)) ASC
        """)
    List<DeliveryDateCountView> countByStatusesGroupedByCreatedDateInWindow(
        @Param("statuses") Set<DeliveryStatus> statuses,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT
          d.status AS status,
          COUNT(d) AS metricValue
        FROM Delivery d
        WHERE d.createdAt >= :fromInclusive
          AND d.createdAt < :toExclusive
        GROUP BY d.status
        ORDER BY COUNT(d) DESC, d.status ASC
        """)
    List<DeliveryStatusCountView> countGroupedByStatusInCreatedWindow(
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT
          d.customer.id AS customerId,
          COUNT(d) AS ordersCount,
          COALESCE(SUM(d.totalAmount), 0) AS totalSpend
        FROM Delivery d
        WHERE d.customer.id IN :customerIds
          AND d.status = :status
        GROUP BY d.customer.id
        """)
    List<CustomerOrderSpendView> aggregateCustomerOrdersAndSpend(
        @Param("customerIds") List<UUID> customerIds,
        @Param("status") DeliveryStatus status
    );

    @Query("""
        SELECT
          d.courier.id AS courierId,
          COUNT(d) AS deliveriesCount
        FROM Delivery d
        WHERE d.courier.id IN :courierIds
        GROUP BY d.courier.id
        """)
    List<CourierDeliveriesCountView> countDeliveriesByCourierIds(
        @Param("courierIds") List<UUID> courierIds
    );

    @Query("""
        SELECT COUNT(d)
        FROM Delivery d
        WHERE d.courier.id IS NOT NULL
        """)
    long countAllCourierDeliveries();

    @Query("""
        SELECT COALESCE(SUM(d.totalAmount), 0)
        FROM Delivery d
        WHERE d.status = :status
        """)
    BigDecimal sumTotalRevenueForCustomers(@Param("status") DeliveryStatus status);

    @Query("""
        SELECT d.currency
        FROM Delivery d
        WHERE d.status = :status
        GROUP BY d.currency
        ORDER BY COUNT(d) DESC, d.currency ASC
        """)
    List<String> findRevenueCurrenciesForCustomers(@Param("status") DeliveryStatus status);

    @Query("""
        SELECT d.currency
        FROM Delivery d
        WHERE d.customer.id = :customerId
          AND d.status = :status
        GROUP BY d.currency
        ORDER BY COUNT(d) DESC, d.currency ASC
        """)
    List<String> findTopCurrenciesForCustomerByStatus(
        @Param("customerId") UUID customerId,
        @Param("status") DeliveryStatus status
    );

    @Query("""
        SELECT COALESCE(SUM(d.totalAmount), 0)
        FROM Delivery d
        WHERE d.customer.id = :customerId
          AND d.status = :status
          AND d.currency = :currency
        """)
    BigDecimal sumTotalAmountByCustomerStatusAndCurrency(
        @Param("customerId") UUID customerId,
        @Param("status") DeliveryStatus status,
        @Param("currency") String currency
    );
}
