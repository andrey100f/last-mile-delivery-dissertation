package com.ubb.deliveryhub.courier.repository;

import com.ubb.deliveryhub.courier.domain.CourierProfile;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CourierProfileRepository extends JpaRepository<CourierProfile, UUID> {

    @EntityGraph(attributePaths = {"user", "availabilitySlots"})
    @Query("SELECT cp FROM CourierProfile cp WHERE cp.user.id = :userId")
    Optional<CourierProfile> findByUserId(@Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"user", "availabilitySlots"})
    @Query("SELECT cp FROM CourierProfile cp WHERE cp.user.id = :userId")
    Optional<CourierProfile> findByUserIdForUpdate(@Param("userId") UUID userId);
}
