package com.ubb.deliveryhub.admin.service;

import com.ubb.deliveryhub.admin.AdminUserListDefaults;
import com.ubb.deliveryhub.admin.domain.dto.AdminCourierSummaryDto;
import com.ubb.deliveryhub.admin.domain.dto.AdminCustomerSummaryDto;
import com.ubb.deliveryhub.admin.domain.dto.AdminManagedUserDto;
import com.ubb.deliveryhub.admin.domain.dto.CreateAdminCourierRequestDto;
import com.ubb.deliveryhub.admin.domain.dto.CreateAdminCustomerRequestDto;
import com.ubb.deliveryhub.admin.domain.exception.AdminUserEmailConflictException;
import com.ubb.deliveryhub.admin.domain.exception.InvalidAdminUserPaginationException;
import com.ubb.deliveryhub.admin.domain.exception.InvalidAdminUserSortException;
import com.ubb.deliveryhub.admin.integration.courier.domain.CourierProfile;
import com.ubb.deliveryhub.admin.integration.courier.repository.CourierAvailabilityView;
import com.ubb.deliveryhub.admin.integration.courier.repository.CourierProfileRepository;
import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.admin.integration.delivery.repository.CourierDeliveriesCountView;
import com.ubb.deliveryhub.admin.integration.delivery.repository.CustomerOrderSpendView;
import com.ubb.deliveryhub.admin.integration.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.common.domain.enums.UserRole;
import com.ubb.deliveryhub.admin.integration.identity.AdminUserQueryRepository;
import com.ubb.deliveryhub.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserManagementService {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
        "createdAt",
        "updatedAt",
        "email",
        "displayName",
        "phoneNumber"
    );

    private final AdminUserQueryRepository userRepository;
    private final CourierProfileRepository courierProfileRepository;
    private final DeliveryRepository deliveryRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<AdminManagedUserDto> listCouriers(Pageable pageable, String searchRaw, String availabilityRaw) {
        if (pageable == null || !pageable.isPaged()) {
            throw new InvalidAdminUserPaginationException();
        }

        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDeterministicSort(pageable);
        String searchPattern = normalizeSearchPattern(searchRaw);
        Boolean availableNow = normalizeAvailabilityFilter(availabilityRaw);
        Page<User> page = userRepository
            .findCouriersByRoleWithSearchAndAvailability(
                UserRole.COURIER,
                searchPattern,
                availableNow,
                effective
            );

        List<UUID> courierIds = page.stream().map(User::getId).toList();
        Map<UUID, CourierAvailabilityView> availabilityByCourier = courierIds.isEmpty()
            ? Map.of()
            : courierProfileRepository
                .findAvailabilityByUserIds(courierIds)
                .stream()
                .collect(Collectors.toMap(CourierAvailabilityView::getUserId, Function.identity()));
        Map<UUID, CourierDeliveriesCountView> deliveriesByCourier = courierIds.isEmpty()
            ? Map.of()
            : deliveryRepository
                .countDeliveriesByCourierIds(courierIds)
                .stream()
                .collect(Collectors.toMap(CourierDeliveriesCountView::getCourierId, Function.identity()));

        return page.map((user) -> {
            CourierAvailabilityView availability = availabilityByCourier.get(user.getId());
            CourierDeliveriesCountView deliveries = deliveriesByCourier.get(user.getId());
            boolean isAvailable = availability != null && availability.isAvailableNow();
            long deliveriesCount = deliveries != null ? deliveries.getDeliveriesCount() : 0L;
            return AdminManagedUserDto.fromUserWithCourierStats(
                user,
                isAvailable,
                deliveriesCount
            );
        });
    }

    @Transactional(readOnly = true)
    public Page<AdminManagedUserDto> listCustomers(Pageable pageable, String searchRaw) {
        if (pageable == null || !pageable.isPaged()) {
            throw new InvalidAdminUserPaginationException();
        }

        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDeterministicSort(pageable);
        String searchPattern = normalizeSearchPattern(searchRaw);
        Page<User> page = userRepository.findByRoleWithSearch(UserRole.CUSTOMER, searchPattern, effective);

        List<UUID> customerIds = page.stream().map(User::getId).toList();
        Map<UUID, CustomerOrderSpendView> orderSpendByCustomer = customerIds.isEmpty()
            ? Map.of()
            : deliveryRepository
                .aggregateCustomerOrdersAndSpend(customerIds, DeliveryStatus.DELIVERED)
                .stream()
                .collect(Collectors.toMap(CustomerOrderSpendView::getCustomerId, Function.identity()));

        String revenueCurrency = resolveCustomerRevenueCurrency();
        return page.map((user) -> {
            CustomerOrderSpendView stats = orderSpendByCustomer.get(user.getId());
            long ordersCount = stats != null ? stats.getOrdersCount() : 0L;
            BigDecimal totalSpend = stats != null && stats.getTotalSpend() != null
                ? stats.getTotalSpend()
                : BigDecimal.ZERO;
            return AdminManagedUserDto.fromUserWithCustomerStats(
                user,
                ordersCount,
                totalSpend,
                revenueCurrency
            );
        });
    }

    @Transactional(readOnly = true)
    public AdminCourierSummaryDto getCourierSummary() {
        return AdminCourierSummaryDto.builder()
            .totalCouriers(userRepository.countByRole(UserRole.COURIER))
            .activeNow(courierProfileRepository.countByAvailableNowTrue())
            .totalDeliveries(deliveryRepository.countAllCourierDeliveries())
            .build();
    }

    @Transactional(readOnly = true)
    public AdminCustomerSummaryDto getCustomerSummary() {
        long totalCustomers = userRepository.countByRole(UserRole.CUSTOMER);
        BigDecimal totalRevenue = deliveryRepository.sumTotalRevenueForCustomers(DeliveryStatus.DELIVERED);
        return AdminCustomerSummaryDto.builder()
            .totalCustomers(totalCustomers)
            .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
            .revenueCurrency(resolveCustomerRevenueCurrency())
            .build();
    }

    @Transactional
    public AdminManagedUserDto createCourier(CreateAdminCourierRequestDto request) {
        User saved = createUser(
            UserRole.COURIER,
            request.getEmail(),
            request.getPassword(),
            request.getDisplayName(),
            request.getPhoneNumber()
        );
        CourierProfile profile = new CourierProfile();
        profile.setUser(saved);
        profile.setDisplayName(saved.getDisplayName());
        profile.setPhone(saved.getPhoneNumber());
        profile.setAvailableNow(Boolean.TRUE.equals(request.getAvailableNow()));
        profile.setExpressCapable(Boolean.TRUE.equals(request.getExpressCapable()));
        courierProfileRepository.save(profile);
        return AdminManagedUserDto.fromUser(saved);
    }

    @Transactional
    public AdminManagedUserDto createCustomer(CreateAdminCustomerRequestDto request) {
        User saved = createUser(
            UserRole.CUSTOMER,
            request.getEmail(),
            request.getPassword(),
            request.getDisplayName(),
            request.getPhoneNumber()
        );
        return AdminManagedUserDto.fromUser(saved);
    }

    private Page<AdminManagedUserDto> listByRole(UserRole role, Pageable pageable, String searchRaw) {
        if (pageable == null || !pageable.isPaged()) {
            throw new InvalidAdminUserPaginationException();
        }

        assertAllowedSort(pageable.getSort());
        Pageable effective = applyDeterministicSort(pageable);
        String searchPattern = normalizeSearchPattern(searchRaw);
        return userRepository.findByRoleWithSearch(role, searchPattern, effective).map(AdminManagedUserDto::fromUser);
    }

    private User createUser(
        UserRole role,
        String emailRaw,
        String passwordRaw,
        String displayNameRaw,
        String phoneNumberRaw
    ) {
        String normalizedEmail = normalizeEmail(emailRaw);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new AdminUserEmailConflictException(normalizedEmail);
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(passwordRaw));
        user.setDisplayName(normalizeDisplayName(displayNameRaw));
        user.setPhoneNumber(normalizePhone(phoneNumberRaw));
        user.setRole(role);

        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            if (isDuplicateEmailViolation(ex, normalizedEmail)) {
                throw new AdminUserEmailConflictException(normalizedEmail);
            }
            throw ex;
        }
    }

    private static void assertAllowedSort(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        for (Sort.Order order : sort) {
            if (!ALLOWED_SORT_PROPERTIES.contains(order.getProperty())) {
                throw new InvalidAdminUserSortException(order.getProperty(), ALLOWED_SORT_PROPERTIES);
            }
        }
    }

    private static Pageable applyDeterministicSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, AdminUserListDefaults.SORT_PROPERTY).and(Sort.by(Sort.Direction.DESC, "id"))
            );
        }
        return PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id"))
        );
    }

    private static String normalizeSearchPattern(String searchRaw) {
        if (searchRaw == null) {
            return null;
        }
        String normalized = searchRaw.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return "%" + normalized.toLowerCase(Locale.ROOT) + "%";
    }

    private String resolveCustomerRevenueCurrency() {
        List<String> currencies = deliveryRepository.findRevenueCurrenciesForCustomers(DeliveryStatus.DELIVERED);
        if (currencies.isEmpty()) {
            return "RON";
        }
        String currency = currencies.get(0);
        return (currency == null || currency.isBlank()) ? "RON" : currency;
    }

    private static Boolean normalizeAvailabilityFilter(String availabilityRaw) {
        if (availabilityRaw == null) {
            return null;
        }

        String normalized = availabilityRaw.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return null;
        }

        return switch (normalized) {
            case "available" -> Boolean.TRUE;
            case "unavailable" -> Boolean.FALSE;
            default -> null;
        };
    }

    private static String normalizeEmail(String emailRaw) {
        return emailRaw.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeDisplayName(String displayNameRaw) {
        return displayNameRaw.trim();
    }

    private static String normalizePhone(String phoneRaw) {
        if (phoneRaw == null) {
            return null;
        }
        String normalized = phoneRaw.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean isDuplicateEmailViolation(DataIntegrityViolationException ex, String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return true;
        }
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (message == null) {
            return false;
        }
        String lowered = message.toLowerCase(Locale.ROOT);
        return lowered.contains("users_email")
            || lowered.contains("users_email_idx")
            || lowered.contains("users_email_key");
    }
}
