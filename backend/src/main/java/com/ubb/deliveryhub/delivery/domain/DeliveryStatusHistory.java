package com.ubb.deliveryhub.delivery.domain;

import com.ubb.deliveryhub.identity.domain.User;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_status_history")
@Data
public class DeliveryStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false)
    private Delivery delivery;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DeliveryStatus status;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(length = 2000)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actor;

    @PrePersist
    private void onCreate() {
        if (this.recordedAt == null) {
            this.recordedAt = Instant.now();
        }
    }
}
