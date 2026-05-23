package com.ubb.deliveryhub.courier.integration.delivery.repository;

import com.ubb.deliveryhub.courier.integration.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DeliveryStatusHistoryRepository extends JpaRepository<DeliveryStatusHistory, UUID> {

    List<DeliveryStatusHistory> findByDelivery_IdOrderByRecordedAtAsc(UUID deliveryId);

    @Query("""
        SELECT d.currency
        FROM DeliveryStatusHistory h
        JOIN h.delivery d
        WHERE d.courier.id = :courierId
          AND h.status = :status
        GROUP BY d.currency
        ORDER BY COUNT(h.id) DESC, d.currency ASC
        """)
    List<String> findDominantDeliveredCurrenciesForCourier(
        @Param("courierId") UUID courierId,
        @Param("status") DeliveryStatus status
    );

    @Query("""
        SELECT d.currency
        FROM DeliveryStatusHistory h
        JOIN h.delivery d
        WHERE d.courier.id = :courierId
          AND h.status = :status
          AND h.recordedAt >= :fromInclusive
          AND h.recordedAt < :toExclusive
        GROUP BY d.currency
        ORDER BY COUNT(h.id) DESC, d.currency ASC
        """)
    List<String> findDominantDeliveredCurrenciesForCourier(
        @Param("courierId") UUID courierId,
        @Param("status") DeliveryStatus status,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT COALESCE(SUM(d.totalAmount), 0)
        FROM DeliveryStatusHistory h
        JOIN h.delivery d
        WHERE d.courier.id = :courierId
          AND h.status = :status
          AND h.recordedAt >= :fromInclusive
          AND h.recordedAt < :toExclusive
          AND d.currency = :currency
        """)
    BigDecimal sumDeliveredEarningsByCourierAndCurrencyInWindow(
        @Param("courierId") UUID courierId,
        @Param("status") DeliveryStatus status,
        @Param("currency") String currency,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );

    @Query("""
        SELECT d.id AS deliveryId,
               d.trackingCode AS trackingCode,
               d.totalAmount AS totalAmount,
               d.currency AS currency,
               h.status AS status,
               h.recordedAt AS recordedAt,
               h.note AS note
        FROM DeliveryStatusHistory h
        JOIN h.delivery d
        WHERE d.courier.id = :courierId
          AND h.status = :status
          AND h.recordedAt >= :fromInclusive
          AND h.recordedAt < :toExclusive
          AND d.currency = :currency
        """)
    Page<CourierEarningEntryView> findDeliveredEarningsEntriesForCourier(
        @Param("courierId") UUID courierId,
        @Param("status") DeliveryStatus status,
        @Param("currency") String currency,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive,
        Pageable pageable
    );

    @Query("""
        SELECT d.id AS deliveryId,
               d.trackingCode AS trackingCode,
               d.totalAmount AS totalAmount,
               d.currency AS currency,
               h.status AS status,
               h.recordedAt AS recordedAt,
               h.note AS note
        FROM DeliveryStatusHistory h
        JOIN h.delivery d
        WHERE d.courier.id = :courierId
          AND h.status = :status
          AND d.currency = :currency
        """)
    Page<CourierEarningEntryView> findDeliveredEarningsEntriesForCourier(
        @Param("courierId") UUID courierId,
        @Param("status") DeliveryStatus status,
        @Param("currency") String currency,
        Pageable pageable
    );

    @Query("""
        SELECT d.id AS deliveryId,
               d.trackingCode AS trackingCode,
               d.totalAmount AS totalAmount,
               d.currency AS currency,
               h.status AS status,
               h.recordedAt AS recordedAt,
               h.note AS note
        FROM DeliveryStatusHistory h
        JOIN h.delivery d
        WHERE d.courier.id = :courierId
          AND h.status = :status
          AND h.recordedAt >= :fromInclusive
          AND h.recordedAt < :toExclusive
          AND d.currency = :currency
        ORDER BY h.recordedAt ASC, d.id ASC
        """)
    List<CourierEarningEntryView> findDeliveredEarningsEntriesInWindow(
        @Param("courierId") UUID courierId,
        @Param("status") DeliveryStatus status,
        @Param("currency") String currency,
        @Param("fromInclusive") Instant fromInclusive,
        @Param("toExclusive") Instant toExclusive
    );
}
