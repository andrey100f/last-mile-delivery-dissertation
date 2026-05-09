package com.ubb.deliveryhub.identity.repository;

import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.embedded.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndRole(String email, UserRole role);

}
