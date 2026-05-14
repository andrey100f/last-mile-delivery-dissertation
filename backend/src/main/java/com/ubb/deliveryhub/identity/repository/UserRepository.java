package com.ubb.deliveryhub.identity.repository;

import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.embedded.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndRole(String email, UserRole role);

    long countByRole(UserRole role);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
        SELECT u
        FROM User u
        WHERE u.role = :role
          AND (
            :searchPattern IS NULL
            OR LOWER(u.email) LIKE :searchPattern
            OR LOWER(COALESCE(u.displayName, '')) LIKE :searchPattern
            OR LOWER(COALESCE(u.phoneNumber, '')) LIKE :searchPattern
          )
        """)
    Page<User> findByRoleWithSearch(
        @Param("role") UserRole role,
        @Param("searchPattern") String searchPattern,
        Pageable pageable
    );

    @Query("""
        SELECT u
        FROM User u
        WHERE u.role = :role
          AND (
            :searchPattern IS NULL
            OR LOWER(u.email) LIKE :searchPattern
            OR LOWER(COALESCE(u.displayName, '')) LIKE :searchPattern
            OR LOWER(COALESCE(u.phoneNumber, '')) LIKE :searchPattern
          )
          AND (
            :availableNow IS NULL
            OR EXISTS (
              SELECT 1
              FROM CourierProfile cp
              WHERE cp.user = u
                AND cp.availableNow = :availableNow
            )
          )
        """)
    Page<User> findCouriersByRoleWithSearchAndAvailability(
        @Param("role") UserRole role,
        @Param("searchPattern") String searchPattern,
        @Param("availableNow") Boolean availableNow,
        Pageable pageable
    );
}
