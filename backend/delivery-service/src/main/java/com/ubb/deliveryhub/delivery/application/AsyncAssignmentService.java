package com.ubb.deliveryhub.delivery.application;

import com.ubb.deliveryhub.common.client.CourierServiceClient;
import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.common.domain.enums.DeliveryType;
import com.ubb.deliveryhub.common.messaging.DeliveryCreatedMessage;
import com.ubb.deliveryhub.common.persistence.ProcessedMessage;
import com.ubb.deliveryhub.common.repository.ProcessedMessageRepository;
import com.ubb.deliveryhub.common.repository.UserRepository;
import com.ubb.deliveryhub.delivery.application.exception.PermanentMessageProcessingException;
import com.ubb.deliveryhub.delivery.application.exception.TransientMessageProcessingException;
import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStateMachine;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusHistoryRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AsyncAssignmentService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryStatusHistoryRepository historyRepository;
    private final CourierServiceClient courierServiceClient;
    private final UserRepository userRepository;
    private final DeliveryStateMachine deliveryStateMachine;
    private final ProcessedMessageRepository processedMessageRepository;

    public AsyncAssignmentService(
        DeliveryRepository deliveryRepository,
        DeliveryStatusHistoryRepository historyRepository,
        CourierServiceClient courierServiceClient,
        UserRepository userRepository,
        DeliveryStateMachine deliveryStateMachine,
        ProcessedMessageRepository processedMessageRepository
    ) {
        this.deliveryRepository = deliveryRepository;
        this.historyRepository = historyRepository;
        this.courierServiceClient = courierServiceClient;
        this.userRepository = userRepository;
        this.deliveryStateMachine = deliveryStateMachine;
        this.processedMessageRepository = processedMessageRepository;
    }

    @Transactional
    public AsyncAssignmentOutcome assignFromDeliveryCreated(DeliveryCreatedMessage message, String consumerName) {
        ProcessedMessage marker = createProcessingMarker(consumerName, message);
        if (marker == null) {
            return AsyncAssignmentOutcome.NOOP_DUPLICATE;
        }

        Delivery delivery = deliveryRepository.findWithCustomerAndCourierByIdForUpdate(message.deliveryId())
            .orElseThrow(() -> new PermanentMessageProcessingException(
                "DELIVERY_NOT_FOUND",
                "Delivery not found for id " + message.deliveryId()
            ));

        if (delivery.getCourier() != null
            || !deliveryStateMachine.canTransition(delivery.getStatus(), DeliveryStatus.ASSIGNED)) {
            marker.setOutcome(AsyncAssignmentOutcome.NOOP_ALREADY_ASSIGNED.name());
            marker.setProcessedAt(Instant.now());
            return AsyncAssignmentOutcome.NOOP_ALREADY_ASSIGNED;
        }

        boolean requiresExpress = delivery.getDeliveryType() == DeliveryType.EXPRESS;
        UUID courierUserId = courierServiceClient.assignNextCourier(requiresExpress).courierUserId();
        User courier = userRepository.findById(courierUserId)
            .orElseThrow(() -> new PermanentMessageProcessingException(
                "COURIER_NOT_FOUND",
                "Courier user not found for id " + courierUserId
            ));

        delivery.setCourier(courier);
        delivery.setStatus(DeliveryStatus.ASSIGNED);

        DeliveryStatusHistory historyEntry = new DeliveryStatusHistory();
        historyEntry.setDelivery(delivery);
        historyEntry.setStatus(DeliveryStatus.ASSIGNED);
        historyEntry.setActor(courier);
        historyRepository.save(historyEntry);

        deliveryRepository.save(delivery);

        marker.setOutcome(AsyncAssignmentOutcome.ASSIGNED.name());
        marker.setProcessedAt(Instant.now());
        return AsyncAssignmentOutcome.ASSIGNED;
    }

    private ProcessedMessage createProcessingMarker(String consumerName, DeliveryCreatedMessage message) {
        ProcessedMessage processed = new ProcessedMessage();
        processed.setConsumerName(consumerName);
        processed.setEventId(message.eventId());
        processed.setDeliveryId(message.deliveryId());
        processed.setOutcome("PROCESSING");
        processed.setProcessedAt(Instant.now());
        try {
            return processedMessageRepository.save(processed);
        } catch (DataIntegrityViolationException ex) {
            return null;
        }
    }
}
