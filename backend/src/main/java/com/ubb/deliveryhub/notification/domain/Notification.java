package com.ubb.deliveryhub.notification.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.notification.domain.id.NotificationId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = NotificationId.TABLE_NAME,
    indexes = {
        @Index(name = NotificationId.IDX_USER_CREATED_AT_DESC, columnList = NotificationId.USER_ID + "," + NotificationId.CREATED_AT),
        @Index(name = NotificationId.IDX_USER_READ_AT, columnList = NotificationId.USER_ID + "," + NotificationId.READ_AT),
        @Index(name = NotificationId.IDX_DEDUPE_KEY, columnList = NotificationId.DEDUPE_KEY)
    }
)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = NotificationId.USER_ID, nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = NotificationId.DELIVERY_ID)
    private Delivery delivery;

    @Enumerated(EnumType.STRING)
    @Column(name = NotificationId.TYPE, nullable = false, length = 64)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = NotificationId.CATEGORY, nullable = false, length = 32)
    private NotificationCategory category;

    @Column(name = NotificationId.TITLE, nullable = false, length = 255)
    private String title;

    @Column(name = NotificationId.MESSAGE, nullable = false, length = 2000)
    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = NotificationId.PAYLOAD_JSON)
    private JsonNode payloadJson;

    @Column(name = NotificationId.DEDUPE_KEY, length = 255)
    private String dedupeKey;

    @Column(name = NotificationId.CREATED_AT, nullable = false)
    private Instant createdAt;

    @Column(name = NotificationId.READ_AT)
    private Instant readAt;

    @PrePersist
    private void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
