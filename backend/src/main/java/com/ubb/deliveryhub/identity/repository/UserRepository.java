package com.ubb.deliveryhub.identity.repository;

import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.embedded.UserRole;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndRole(String email, UserRole role);

    @Modifying(flushAutomatically = true)
    @Query("""
        UPDATE User u
        SET u.displayName = :displayName,
            u.phoneNumber = :phoneNumber
        WHERE u.id = :userId
        """)
    int updateIdentityProfileFields(
        @Param("userId") UUID userId,
        @Param("displayName") String displayName,
        @Param("phoneNumber") String phoneNumber
    );

}
