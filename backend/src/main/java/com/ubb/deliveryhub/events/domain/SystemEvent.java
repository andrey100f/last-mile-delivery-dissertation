package com.ubb.deliveryhub.events.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.ubb.deliveryhub.events.domain.id.SystemEventId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
    name = SystemEventId.TABLE_NAME,
    indexes = {
        @Index(name = SystemEventId.IDX_CREATED_AT_ID_DESC, columnList = SystemEventId.CREATED_AT + ",id"),
        @Index(name = SystemEventId.IDX_TYPE_CREATED_AT_ID_DESC, columnList = SystemEventId.TYPE + "," + SystemEventId.CREATED_AT + ",id")
    }
)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class SystemEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = SystemEventId.TYPE, nullable = false, length = 64)
    private SystemEventType type;

    @Enumerated(EnumType.STRING)
    @Column(name = SystemEventId.ACTOR_TYPE, nullable = false, length = 32)
    private SystemEventActorType actorType;

    @Column(name = SystemEventId.ACTOR_ID)
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = SystemEventId.TARGET_TYPE, nullable = false, length = 32)
    private SystemEventTargetType targetType;

    @Column(name = SystemEventId.TARGET_ID)
    private UUID targetId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = SystemEventId.METADATA, nullable = false)
    private JsonNode metadata;

    @Column(name = SystemEventId.CREATED_AT, nullable = false)
    private Instant createdAt;

    @PrePersist
    private void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
