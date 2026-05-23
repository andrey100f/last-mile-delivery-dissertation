package com.ubb.deliveryhub.common.repository;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

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
}
