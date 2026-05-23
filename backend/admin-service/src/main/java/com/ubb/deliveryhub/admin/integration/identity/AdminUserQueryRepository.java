package com.ubb.deliveryhub.admin.integration.identity;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.UserRole;
import com.ubb.deliveryhub.common.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminUserQueryRepository extends UserRepository {

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
