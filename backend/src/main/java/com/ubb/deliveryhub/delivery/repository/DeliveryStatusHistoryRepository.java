package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeliveryStatusHistoryRepository extends JpaRepository<DeliveryStatusHistory, UUID> {

    List<DeliveryStatusHistory> findByDelivery_IdOrderByRecordedAtAsc(UUID deliveryId);
}
