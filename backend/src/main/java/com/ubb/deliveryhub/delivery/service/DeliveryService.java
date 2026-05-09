package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.delivery.DeliveryListDefaults;
import com.ubb.deliveryhub.courier.domain.exception.CourierProfileNotFoundException;
import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStateMachine;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import com.ubb.deliveryhub.delivery.domain.dto.AvailableDeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliverySummaryDto;
import com.ubb.deliveryhub.delivery.domain.dto.UpdateDeliveryStatusRequest;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryNotFoundException;
import com.ubb.deliveryhub.delivery.domain.exception.CourierExpressNotCapableException;
import com.ubb.deliveryhub.delivery.domain.exception.CourierUnavailableForAcceptanceException;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryTakenException;
import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliveryPaginationException;
import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliverySortException;
import com.ubb.deliveryhub.delivery.events.DeliveryStatusChangedEvent;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.repository.DeliverySpecifications;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusHistoryRepository;
import com.ubb.deliveryhub.courier.repository.CourierProfileRepository;
import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.exception.EntityNotFoundException;
import com.ubb.deliveryhub.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
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

    private final DeliveryRepository deliveryRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final UserRepository userRepository;
    private final CourierProfileRepository courierProfileRepository;
    private final DeliveryAuthorization deliveryAuthorization;
    private final DeliveryStateMachine deliveryStateMachine;
    private final ApplicationEventPublisher eventPublisher;
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
        deliveryAuthorization.assertCanView(delivery, authentication);
        var history = deliveryStatusHistoryRepository.findByDelivery_IdOrderByRecordedAtAsc(id);
        return DeliveryMapper.toDetailDto(delivery, history);
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
        var profileOpt = courierProfileRepository.findByUserId(courierId);
        if (profileOpt.isEmpty() || !profileOpt.get().isAvailableNow()) {
            return Page.empty(effective);
        }

        DeliveryType effectiveDeliveryType = deliveryType;
        if (!profileOpt.get().isExpressCapable()) {
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
        var profile = courierProfileRepository.findByUserIdForUpdate(courierId)
            .orElseThrow(CourierProfileNotFoundException::new);
        if (!profile.isAvailableNow()) {
            throw new CourierUnavailableForAcceptanceException();
        }

        Delivery delivery = deliveryRepository.findWithCustomerAndCourierByIdForUpdate(deliveryId)
            .orElseThrow(DeliveryNotFoundException::new);
        if (delivery.getDeliveryType() == DeliveryType.EXPRESS && !profile.isExpressCapable()) {
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

        deliveryAuthorization.assertAssignedCourier(delivery, courierId);

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
        publishAfterCommit(saved.getId(), fromStatus, targetStatus, courierId);
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
        UUID actorId
    ) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                eventPublisher.publishEvent(new DeliveryStatusChangedEvent(deliveryId, fromStatus, toStatus, actorId));
            }
        });
    }
}
