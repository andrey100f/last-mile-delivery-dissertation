package com.ubb.deliveryhub.identity.domain;

import com.ubb.deliveryhub.identity.domain.embedded.UserRole;
import com.ubb.deliveryhub.identity.domain.id.UserId;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = UserId.TABLE_NAME,
    indexes = {
        @Index(name = "users_email_idx", columnList = "email", unique = true)
    }
)
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = UserId.EMAIL, nullable = false)
    private String email;

    @Column(name = UserId.PASSWORD_HASH, nullable = false)
    private String passwordHash;

    @Column(name = UserId.ROLE, nullable = false)
    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = UserId.CREATED_AT,  nullable = false)
    private Instant createdAt;

    @Column(name = UserId.UPDATED_AT,  nullable = false)
    private Instant updatedAt;

    @PrePersist
    private void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    private void onUpdate() {
        this.updatedAt = Instant.now();
    }

}
