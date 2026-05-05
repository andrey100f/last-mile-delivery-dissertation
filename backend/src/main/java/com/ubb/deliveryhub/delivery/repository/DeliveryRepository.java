package com.ubb.deliveryhub.delivery.repository;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {

    Page<Delivery> findByCustomer_Id(UUID customerId, Pageable pageable);

    boolean existsByCustomer_IdAndId(UUID customerId, UUID id);
}
