package com.ubb.deliveryhub.admin.service;

import com.ubb.deliveryhub.admin.AdminUserListDefaults;
import com.ubb.deliveryhub.admin.domain.dto.AdminManagedUserDto;
import com.ubb.deliveryhub.admin.domain.dto.CreateAdminCourierRequestDto;
import com.ubb.deliveryhub.admin.domain.dto.CreateAdminCustomerRequestDto;
import com.ubb.deliveryhub.admin.domain.exception.AdminUserEmailConflictException;
import com.ubb.deliveryhub.admin.domain.exception.InvalidAdminUserPaginationException;
import com.ubb.deliveryhub.admin.domain.exception.InvalidAdminUserSortException;
import com.ubb.deliveryhub.courier.domain.CourierProfile;
import com.ubb.deliveryhub.courier.repository.CourierProfileRepository;
import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.embedded.UserRole;
import com.ubb.deliveryhub.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

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

    private final UserRepository userRepository;
    private final CourierProfileRepository courierProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<AdminManagedUserDto> listCouriers(Pageable pageable, String searchRaw) {
        return listByRole(UserRole.COURIER, pageable, searchRaw);
    }

    @Transactional(readOnly = true)
    public Page<AdminManagedUserDto> listCustomers(Pageable pageable, String searchRaw) {
        return listByRole(UserRole.CUSTOMER, pageable, searchRaw);
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
        String search = normalizeSearch(searchRaw);
        return userRepository.findByRoleWithSearch(role, search, effective).map(AdminManagedUserDto::fromUser);
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

    private static String normalizeSearch(String searchRaw) {
        if (searchRaw == null) {
            return null;
        }
        String normalized = searchRaw.trim();
        return normalized.isEmpty() ? null : normalized;
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
