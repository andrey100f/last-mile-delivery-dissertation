package com.ubb.deliveryhub.courier.integration.delivery.domain;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.courier.integration.delivery.domain.id.DeliveryStatusHistoryId;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = DeliveryStatusHistoryId.TABLE_NAME)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class DeliveryStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = DeliveryStatusHistoryId.DELIVERY_ID, nullable = false)
    private Delivery delivery;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = DeliveryStatusHistoryId.STATUS, nullable = false, columnDefinition = "delivery_status")
    private DeliveryStatus status;

    @Column(name = DeliveryStatusHistoryId.RECORDED_AT, nullable = false)
    private Instant recordedAt;

    @Column(name = DeliveryStatusHistoryId.NOTE, length = 2000)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = DeliveryStatusHistoryId.ACTOR_USER_ID)
    private User actor;

    @PrePersist
    private void onCreate() {
        if (this.recordedAt == null) {
            this.recordedAt = Instant.now();
        }
    }
}
