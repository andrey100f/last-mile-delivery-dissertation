package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.common.client.CourierServiceClient;
import com.ubb.deliveryhub.common.client.EventsClient;
import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.common.domain.enums.DeliveryType;
import com.ubb.deliveryhub.common.exception.EntityNotFoundException;
import com.ubb.deliveryhub.common.messaging.DeliveryCreatedMessage;
import com.ubb.deliveryhub.common.messaging.DeliveryStatusChangedMessage;
import com.ubb.deliveryhub.common.messaging.NotificationEventType;
import com.ubb.deliveryhub.common.messaging.NotificationRequested;
import com.ubb.deliveryhub.common.repository.UserRepository;
import com.ubb.deliveryhub.delivery.DeliveryListDefaults;
import com.ubb.deliveryhub.delivery.application.DeliveryCreatedEventPublisher;
import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStateMachine;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.delivery.domain.dto.AvailableDeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.CustomerHistorySummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryStatusSnapshotDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliverySummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.UpdateDeliveryStatusRequest;
import com.ubb.deliveryhub.delivery.domain.exception.CourierExpressNotCapableException;
import com.ubb.deliveryhub.delivery.domain.exception.CourierUnavailableForAcceptanceException;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryNotFoundException;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryTakenException;
import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliveryPaginationException;
import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliverySortException;
import com.ubb.deliveryhub.delivery.infrastructure.messaging.DeliveryNotificationPublisher;
import com.ubb.deliveryhub.common.security.DeliveryAuthorization;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.repository.DeliverySpecifications;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusHistoryRepository;
import com.ubb.deliveryhub.delivery.infrastructure.messaging.DeliveryTrackingPublisher;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private static final Set<String> ALLOWED_DELIVERY_LIST_SORT_PROPERTIES = Set.of(
        "createdAt",
        "updatedAt",
        "status",
        "deliveryType",
        "totalAmount",
        "trackingCode"
    );

    private static final String TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int TRACKING_BODY_LEN = 10;
    private static final int TRACKING_CODE_SAVE_ATTEMPTS = 15;
    private static final Set<DeliveryStatus> NOTIFIABLE_STATUS_MILESTONES = Set.of(
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED
    );

    private final DeliveryRepository deliveryRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final UserRepository userRepository;
    private final CourierServiceClient courierServiceClient;
    private final DeliveryAuthorization deliveryAuthorization;
    private final DeliveryStateMachine deliveryStateMachine;
    private final DeliveryNotificationPublisher deliveryNotificationPublisher;
    private final DeliveryTrackingPublisher deliveryTrackingPublisher;
    private final DeliveryCreatedEventPublisher deliveryCreatedEventPublisher;
    private final EventsClient eventsClient;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public DeliveryDto createFromPrincipal(Authentication authentication, CreateDeliveryRequest request) {
        UUID customerId = principalUserId(authentication);
        User customer = userRepository.findById(customerId)
            .orElseThrow(() -> new EntityNotFoundException("User with id %s not found".formatted(customerId)));

        for (int attempt = 0; attempt < TRACKING_CODE_SAVE_ATTEMPTS; attempt++) {
            String trackingCode = "DH-" + randomAlphanumeric(TRACKING_BODY_LEN);
            Delivery delivery = DeliveryMapper.newDeliveryEntity(customer, request, trackingCode);
            delivery.setStatus(DeliveryStatus.CREATED);
            try {
                Delivery saved = deliveryRepository.save(delivery);
                DeliveryStatusHistory history = new DeliveryStatusHistory();
                history.setDelivery(saved);
                history.setStatus(DeliveryStatus.CREATED);
                history.setActor(customer);
                deliveryStatusHistoryRepository.save(history);
                publishDeliveryCreatedAfterCommit(saved);
                return DeliveryMapper.toDto(saved);
            } catch (DataIntegrityViolationException ex) {
                if (attempt == TRACKING_CODE_SAVE_ATTEMPTS - 1) {
                    throw ex;
                }
            }
        }
        throw new IllegalStateException("Could not persist delivery with a unique tracking code");
    }

    @Transactional(readOnly = true)
    public DeliveryDetailDto getByIdForCurrentUser(UUID id, Authentication authentication) {
        Delivery delivery = deliveryRepository.findWithCustomerAndCourierById(id)
            .orElseThrow(DeliveryNotFoundException::new);
        UUID courierIdForAuth = delivery.getCourier() != null ? delivery.getCourier().getId() : null;
        deliveryAuthorization.assertCanView(
            delivery.getCustomer().getId(),
            courierIdForAuth,
            delivery.getStatus(),
            authentication
        );
        var history = deliveryStatusHistoryRepository.findByDelivery_IdOrderByRecordedAtAsc(id);
        return DeliveryMapper.toDetailDto(delivery, history);
    }

    @Transactional(readOnly = true)
    public DeliveryStatusSnapshotDto getStatusSnapshotForCurrentUser(UUID id, Authentication authentication) {
        var snapshot = deliveryRepository.findStatusSnapshotById(id)
            .orElseThrow(DeliveryNotFoundException::new);
        deliveryAuthorization.assertCanView(
            snapshot.getCustomerId(),
            snapshot.getCourierId(),
            snapshot.getStatus(),
            authentication
        );
        return DeliveryMapper.toStatusSnapshotDto(
            snapshot.getStatus().name(),
            null,
            snapshot.getUpdatedAt(),
            DeliveryTrackingProgress.fromStatus(snapshot.getStatus())
        );
    }

    @Transactional(readOnly = true)
    public Page<DeliverySummaryDto> listForCurrentCustomer(
        Authentication authentication,
        Pageable pageable,
        DeliveryStatus statusFilter
    ) {
        if (!pageable.isPaged()) {
            throw new InvalidDeliveryPaginationException();
        }
        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDefaultSort(pageable);
        UUID customerId = principalUserId(authentication);
        Specification<Delivery> spec = DeliverySpecifications.forCustomerWithOptionalStatus(customerId, statusFilter);
        return deliveryRepository.findAll(spec, effective).map(DeliveryMapper::toSummaryDto);
    }

    @Transactional(readOnly = true)
    public CustomerHistorySummaryDto getHistorySummaryForCurrentCustomer(Authentication authentication) {
        UUID customerId = principalUserId(authentication);
        long totalDeliveries = deliveryRepository.countByCustomer_Id(customerId);
        long deliveredDeliveries = deliveryRepository.countByCustomer_IdAndStatus(customerId, DeliveryStatus.DELIVERED);
        if (deliveredDeliveries == 0) {
            return CustomerHistorySummaryDto.builder()
                .totalDeliveries(totalDeliveries)
                .deliveredDeliveries(0)
                .totalSpent(java.math.BigDecimal.ZERO)
                .totalSpentCurrency("RON")
                .build();
        }

        List<String> currencies = deliveryRepository.findTopCurrenciesForCustomerByStatus(
            customerId,
            DeliveryStatus.DELIVERED
        );
        String currency = currencies.isEmpty() || currencies.get(0) == null || currencies.get(0).isBlank()
            ? "RON"
            : currencies.get(0);
        var totalSpent = deliveryRepository.sumTotalAmountByCustomerStatusAndCurrency(
            customerId,
            DeliveryStatus.DELIVERED,
            currency
        );

        return CustomerHistorySummaryDto.builder()
            .totalDeliveries(totalDeliveries)
            .deliveredDeliveries(deliveredDeliveries)
            .totalSpent(totalSpent != null ? totalSpent : java.math.BigDecimal.ZERO)
            .totalSpentCurrency(currency)
            .build();
    }

    @Transactional(readOnly = true)
    public Page<AvailableDeliveryDto> listAvailableForCurrentCourier(
        Authentication authentication,
        Pageable pageable,
        DeliveryType deliveryType
    ) {
        if (!pageable.isPaged()) {
            throw new InvalidDeliveryPaginationException();
        }
        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDefaultSort(pageable);
        UUID courierId = principalUserId(authentication);
        var profile = courierServiceClient.getProfile(courierId);
        if (profile == null || !profile.availableNow()) {
            return Page.empty(effective);
        }

        DeliveryType effectiveDeliveryType = deliveryType;
        if (!profile.expressCapable()) {
            if (deliveryType == DeliveryType.EXPRESS) {
                return Page.empty(effective);
            }
            if (deliveryType == null) {
                effectiveDeliveryType = DeliveryType.STANDARD;
            }
        }

        Set<DeliveryStatus> assignableStatuses = deliveryStateMachine.statusesTransitioningTo(DeliveryStatus.ASSIGNED);
        return deliveryRepository.findAvailableForCourier(assignableStatuses, effectiveDeliveryType, effective)
            .map(DeliveryMapper::toAvailableDto);
    }

    @Transactional(readOnly = true)
    public Page<AvailableDeliveryDto> listActiveForCurrentCourier(
        Authentication authentication,
        Pageable pageable
    ) {
        if (!pageable.isPaged()) {
            throw new InvalidDeliveryPaginationException();
        }
        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDefaultSort(pageable);
        UUID courierId = principalUserId(authentication);
        Set<DeliveryStatus> activeStatuses = Set.of(
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT
        );
        return deliveryRepository.findActiveForCourier(courierId, activeStatuses, effective)
            .map(DeliveryMapper::toAvailableDto);
    }

    @Transactional
    public DeliveryDetailDto acceptForCurrentCourier(UUID deliveryId, Authentication authentication) {
        UUID courierId = principalUserId(authentication);
        User courier = userRepository.findById(courierId)
            .orElseThrow(() -> new EntityNotFoundException("User with id %s not found".formatted(courierId)));
        var profile = courierServiceClient.getProfile(courierId);
        if (profile == null) {
            throw new EntityNotFoundException("Courier profile not found");
        }
        if (!profile.availableNow()) {
            throw new CourierUnavailableForAcceptanceException();
        }

        Delivery delivery = deliveryRepository.findWithCustomerAndCourierByIdForUpdate(deliveryId)
            .orElseThrow(DeliveryNotFoundException::new);
        if (delivery.getDeliveryType() == DeliveryType.EXPRESS && !profile.expressCapable()) {
            throw new CourierExpressNotCapableException();
        }

        if (delivery.getCourier() != null
            || !deliveryStateMachine.canTransition(delivery.getStatus(), DeliveryStatus.ASSIGNED)) {
            throw new DeliveryTakenException();
        }

        delivery.setCourier(courier);
        delivery.setStatus(DeliveryStatus.ASSIGNED);

        DeliveryStatusHistory historyEntry = new DeliveryStatusHistory();
        historyEntry.setDelivery(delivery);
        historyEntry.setStatus(DeliveryStatus.ASSIGNED);
        historyEntry.setActor(courier);
        deliveryStatusHistoryRepository.save(historyEntry);

        Delivery saved = deliveryRepository.save(delivery);
        emitSystemEventAfterCommit(() ->
            eventsClient.emitDeliveryAssigned(saved.getId(), courierId, saved.getUpdatedAt())
        );
        emitAssignmentNotification(saved, courierId, saved.getUpdatedAt());
        var history = deliveryStatusHistoryRepository.findByDelivery_IdOrderByRecordedAtAsc(saved.getId());
        return DeliveryMapper.toDetailDto(saved, history);
    }

    @Transactional
    public DeliveryDetailDto updateStatusForCurrentCourier(
        UUID deliveryId,
        Authentication authentication,
        UpdateDeliveryStatusRequest request
    ) {
        UUID courierId = principalUserId(authentication);
        Delivery delivery = deliveryRepository.findWithCustomerAndCourierByIdForUpdate(deliveryId)
            .orElseThrow(DeliveryNotFoundException::new);

        deliveryAuthorization.assertAssignedCourier(
            delivery.getCourier() != null ? delivery.getCourier().getId() : null,
            courierId
        );

        DeliveryStatus fromStatus = delivery.getStatus();
        DeliveryStatus targetStatus = request.resolveTargetStatus();
        deliveryStateMachine.assertTransitionAllowed(fromStatus, targetStatus);

        delivery.setStatus(targetStatus);

        DeliveryStatusHistory historyEntry = new DeliveryStatusHistory();
        historyEntry.setDelivery(delivery);
        historyEntry.setStatus(targetStatus);
        historyEntry.setActor(delivery.getCourier());
        deliveryStatusHistoryRepository.save(historyEntry);

        Delivery saved = deliveryRepository.save(delivery);
        publishAfterCommit(saved.getId(), fromStatus, targetStatus, courierId, saved.getUpdatedAt());
        emitSystemEventAfterCommit(() ->
            eventsClient.emitDeliveryStatusChanged(
                saved.getId(),
                courierId,
                fromStatus,
                targetStatus,
                saved.getUpdatedAt()
            )
        );
        emitStatusNotification(saved, courierId, targetStatus, saved.getUpdatedAt());
        var history = deliveryStatusHistoryRepository.findByDelivery_IdOrderByRecordedAtAsc(saved.getId());
        return DeliveryMapper.toDetailDto(saved, history);
    }

    private static UUID principalUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private static void assertAllowedSort(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        for (Sort.Order order : sort) {
            if (!ALLOWED_DELIVERY_LIST_SORT_PROPERTIES.contains(order.getProperty())) {
                throw new InvalidDeliverySortException(order.getProperty(), ALLOWED_DELIVERY_LIST_SORT_PROPERTIES);
            }
        }
    }

    private static Pageable applyDefaultSort(Pageable pageable) {
        if (!pageable.getSort().isUnsorted()) {
            return pageable;
        }
        return PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Direction.DESC, DeliveryListDefaults.SORT_PROPERTY)
        );
    }

    private String randomAlphanumeric(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(TRACKING_ALPHABET.charAt(secureRandom.nextInt(TRACKING_ALPHABET.length())));
        }
        return sb.toString();
    }

    private void publishAfterCommit(
        UUID deliveryId,
        DeliveryStatus fromStatus,
        DeliveryStatus toStatus,
        UUID actorId,
        Instant updatedAt
    ) {
        runAfterCommit(() ->
            deliveryTrackingPublisher.publish(
                new DeliveryStatusChangedMessage(
                    DeliveryStatusChangedMessage.EVENT_VERSION,
                    UUID.randomUUID(),
                    resolveCorrelationId(),
                    deliveryId,
                    fromStatus,
                    toStatus,
                    actorId,
                    updatedAt
                )
            )
        );
    }

    private void emitSystemEventAfterCommit(Runnable action) {
        runAfterCommit(action);
    }

    private void publishDeliveryCreatedAfterCommit(Delivery delivery) {
        UUID eventId = UUID.randomUUID();
        String correlationId = resolveCorrelationId();
        runAfterCommit(() ->
            deliveryCreatedEventPublisher.publish(
                new DeliveryCreatedMessage(
                    1,
                    eventId,
                    UUID.randomUUID().toString(),
                    delivery.getId(),
                    delivery.getCustomer() != null ? delivery.getCustomer().getId() : null,
                    delivery.getCreatedAt(),
                    correlationId,
                    Map.of("source", "delivery.create")
                )
            )
        );
    }

    private static String resolveCorrelationId() {
        String correlationId = MDC.get("correlationId");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = MDC.get("traceId");
        }
        return (correlationId == null || correlationId.isBlank()) ? null : correlationId;
    }

    private void runAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private void emitAssignmentNotification(Delivery delivery, UUID actorId, Instant occurredAt) {
        if (delivery.getCustomer() == null || delivery.getCustomer().getId() == null) {
            return;
        }
        runAfterCommit(() -> deliveryNotificationPublisher.publish(
            new NotificationRequested(
                1,
                UUID.randomUUID(),
                resolveCorrelationId(),
                NotificationEventType.ASSIGNMENT_ACCEPTED,
                delivery.getId(),
                actorId,
                List.of(delivery.getCustomer().getId()),
                delivery.getStatus(),
                occurredAt,
                Map.of("source", "delivery.accept")
            )
        ));
    }

    private void emitStatusNotification(Delivery delivery, UUID actorId, DeliveryStatus targetStatus, Instant occurredAt) {
        if (!NOTIFIABLE_STATUS_MILESTONES.contains(targetStatus)) {
            return;
        }
        if (delivery.getCustomer() == null || delivery.getCustomer().getId() == null) {
            return;
        }
        runAfterCommit(() -> deliveryNotificationPublisher.publish(
            new NotificationRequested(
                1,
                UUID.randomUUID(),
                resolveCorrelationId(),
                NotificationEventType.STATUS_UPDATED,
                delivery.getId(),
                actorId,
                List.of(delivery.getCustomer().getId()),
                targetStatus,
                occurredAt,
                Map.of("source", "delivery.status")
            )
        ));
    }
}
