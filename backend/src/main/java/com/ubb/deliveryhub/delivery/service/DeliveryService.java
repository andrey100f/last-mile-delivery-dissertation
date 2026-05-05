package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatusHistory;
import com.ubb.deliveryhub.delivery.domain.MoneySnapshot;
import com.ubb.deliveryhub.delivery.domain.dto.CreateDeliveryRequest;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDetailDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliveryDto;
import com.ubb.deliveryhub.delivery.domain.dto.DeliverySummaryDto;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryNotFoundException;
import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliverySortException;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.repository.DeliverySpecifications;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusHistoryRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Comparator;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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

    private static final String SORT_ALLOWED_LIST = ALLOWED_DELIVERY_LIST_SORT_PROPERTIES.stream()
        .sorted(Comparator.naturalOrder())
        .collect(Collectors.joining(", "));

    private static final String TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int TRACKING_BODY_LEN = 10;
    private static final int TRACKING_CODE_SAVE_ATTEMPTS = 15;

    private final DeliveryRepository deliveryRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final DeliveryAuthorization deliveryAuthorization;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public DeliveryDto createFromPrincipal(Authentication authentication, CreateDeliveryRequest request) {
        UUID customerId = UUID.fromString(authentication.getName());
        User customer = userRepository.findById(customerId)
            .orElseThrow(() -> new EntityNotFoundException("User with id %s not found".formatted(customerId)));

        MoneySnapshot pricing = pricingService.calculate(request.getDeliveryType(), request.getPackageDetails());

        for (int attempt = 0; attempt < TRACKING_CODE_SAVE_ATTEMPTS; attempt++) {
            String trackingCode = "DH-" + randomAlphanumeric(TRACKING_BODY_LEN);
            Delivery delivery = DeliveryMapper.newDeliveryEntity(customer, request, pricing, trackingCode);
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
        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDefaultSort(pageable);
        UUID customerId = UUID.fromString(authentication.getName());
        Specification<Delivery> spec = DeliverySpecifications.forCustomerWithOptionalStatus(customerId, statusFilter);
        return deliveryRepository.findAll(spec, effective).map(DeliveryMapper::toSummaryDto);
    }

    private static void assertAllowedSort(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        for (Sort.Order order : sort) {
            if (!ALLOWED_DELIVERY_LIST_SORT_PROPERTIES.contains(order.getProperty())) {
                throw new InvalidDeliverySortException(
                    "Invalid sort property: %s. Allowed: %s".formatted(order.getProperty(), SORT_ALLOWED_LIST)
                );
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
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
    }

    private String randomAlphanumeric(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(TRACKING_ALPHABET.charAt(secureRandom.nextInt(TRACKING_ALPHABET.length())));
        }
        return sb.toString();
    }
}
