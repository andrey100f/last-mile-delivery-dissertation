package com.ubb.deliveryhub.delivery.application;

import com.ubb.deliveryhub.courier.domain.CourierProfile;
import com.ubb.deliveryhub.courier.repository.CourierProfileRepository;
import com.ubb.deliveryhub.delivery.application.exception.PermanentMessageProcessingException;
import com.ubb.deliveryhub.delivery.application.exception.TransientMessageProcessingException;
import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStateMachine;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import com.ubb.deliveryhub.delivery.messaging.DeliveryCreatedMessage;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusHistoryRepository;
import com.ubb.deliveryhub.messaging.domain.ProcessedMessage;
import com.ubb.deliveryhub.messaging.repository.ProcessedMessageRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AsyncAssignmentService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryStatusHistoryRepository historyRepository;
    private final CourierProfileRepository courierProfileRepository;
    private final DeliveryStateMachine deliveryStateMachine;
    private final ProcessedMessageRepository processedMessageRepository;

    public AsyncAssignmentService(
        DeliveryRepository deliveryRepository,
        DeliveryStatusHistoryRepository historyRepository,
        CourierProfileRepository courierProfileRepository,
        DeliveryStateMachine deliveryStateMachine,
        ProcessedMessageRepository processedMessageRepository
    ) {
        this.deliveryRepository = deliveryRepository;
        this.historyRepository = historyRepository;
        this.courierProfileRepository = courierProfileRepository;
        this.deliveryStateMachine = deliveryStateMachine;
        this.processedMessageRepository = processedMessageRepository;
    }

    @Transactional
    public AsyncAssignmentOutcome assignFromDeliveryCreated(DeliveryCreatedMessage message, String consumerName) {
        if (processedMessageRepository.existsByConsumerNameAndEventId(consumerName, message.eventId())) {
            return AsyncAssignmentOutcome.NOOP_DUPLICATE;
        }

        Delivery delivery = deliveryRepository.findWithCustomerAndCourierByIdForUpdate(message.deliveryId())
            .orElseThrow(() -> new PermanentMessageProcessingException(
                "DELIVERY_NOT_FOUND",
                "Delivery not found for id " + message.deliveryId()
            ));

        if (delivery.getCourier() != null
            || !deliveryStateMachine.canTransition(delivery.getStatus(), DeliveryStatus.ASSIGNED)) {
            markProcessed(consumerName, message, AsyncAssignmentOutcome.NOOP_ALREADY_ASSIGNED);
            return AsyncAssignmentOutcome.NOOP_ALREADY_ASSIGNED;
        }

        CourierProfile courierProfile = selectCourier(delivery.getDeliveryType());
        delivery.setCourier(courierProfile.getUser());
        delivery.setStatus(DeliveryStatus.ASSIGNED);

        DeliveryStatusHistory historyEntry = new DeliveryStatusHistory();
        historyEntry.setDelivery(delivery);
        historyEntry.setStatus(DeliveryStatus.ASSIGNED);
        historyEntry.setActor(courierProfile.getUser());
        historyRepository.save(historyEntry);

        deliveryRepository.save(delivery);

        if (!markProcessed(consumerName, message, AsyncAssignmentOutcome.ASSIGNED)) {
            return AsyncAssignmentOutcome.NOOP_DUPLICATE;
        }
        return AsyncAssignmentOutcome.ASSIGNED;
    }

    private CourierProfile selectCourier(DeliveryType deliveryType) {
        boolean requiresExpress = deliveryType == DeliveryType.EXPRESS;
        return courierProfileRepository.findAssignableCouriersForUpdate(
                requiresExpress,
                PageRequest.of(0, 1)
            )
            .stream()
            .findFirst()
            .orElseThrow(() -> new TransientMessageProcessingException(
                "No available courier found for delivery type " + deliveryType
            ));
    }

    private boolean markProcessed(
        String consumerName,
        DeliveryCreatedMessage message,
        AsyncAssignmentOutcome outcome
    ) {
        ProcessedMessage processed = new ProcessedMessage();
        processed.setConsumerName(consumerName);
        processed.setEventId(message.eventId());
        processed.setDeliveryId(message.deliveryId());
        processed.setOutcome(outcome.name());
        processed.setProcessedAt(Instant.now());
        try {
            processedMessageRepository.save(processed);
            return true;
        } catch (DataIntegrityViolationException ex) {
            return false;
        }
    }
}
