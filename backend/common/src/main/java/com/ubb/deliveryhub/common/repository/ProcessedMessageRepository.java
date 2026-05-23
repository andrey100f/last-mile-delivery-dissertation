package com.ubb.deliveryhub.common.repository;

import com.ubb.deliveryhub.common.persistence.ProcessedMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedMessageRepository extends JpaRepository<ProcessedMessage, UUID> {

    boolean existsByConsumerNameAndEventId(String consumerName, UUID eventId);
}
