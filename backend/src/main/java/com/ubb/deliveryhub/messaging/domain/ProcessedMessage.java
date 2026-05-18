package com.ubb.deliveryhub.messaging.domain;

import com.ubb.deliveryhub.messaging.domain.id.ProcessedMessageId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = ProcessedMessageId.TABLE_NAME,
    indexes = {
        @Index(
            name = ProcessedMessageId.IDX_CONSUMER_EVENT_UNIQUE,
            columnList = ProcessedMessageId.CONSUMER_NAME + "," + ProcessedMessageId.EVENT_ID,
            unique = true
        ),
        @Index(name = ProcessedMessageId.IDX_DELIVERY_ID, columnList = ProcessedMessageId.DELIVERY_ID)
    }
)
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class ProcessedMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @Column(name = ProcessedMessageId.CONSUMER_NAME, nullable = false, length = 128)
    private String consumerName;

    @Column(name = ProcessedMessageId.EVENT_ID, nullable = false)
    private UUID eventId;

    @Column(name = ProcessedMessageId.DELIVERY_ID)
    private UUID deliveryId;

    @Column(name = ProcessedMessageId.OUTCOME, nullable = false, length = 64)
    private String outcome;

    @Column(name = ProcessedMessageId.PROCESSED_AT, nullable = false)
    private Instant processedAt;

    @Column(name = ProcessedMessageId.CREATED_AT, nullable = false)
    private Instant createdAt;

    @PrePersist
    private void onCreate() {
        Instant now = Instant.now();
        if (processedAt == null) {
            processedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }
}
