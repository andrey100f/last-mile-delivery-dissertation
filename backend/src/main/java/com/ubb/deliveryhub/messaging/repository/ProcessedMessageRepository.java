package com.ubb.deliveryhub.messaging.repository;

import com.ubb.deliveryhub.messaging.domain.ProcessedMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedMessageRepository extends JpaRepository<ProcessedMessage, UUID> {

    boolean existsByConsumerNameAndEventId(String consumerName, UUID eventId);
}
