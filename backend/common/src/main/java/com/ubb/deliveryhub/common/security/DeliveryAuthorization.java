package com.ubb.deliveryhub.common.security;

import com.ubb.deliveryhub.common.domain.enums.DeliveryStatus;
import com.ubb.deliveryhub.common.domain.enums.UserRole;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DeliveryAuthorization {

    private static final String ROLE_PREFIX = "ROLE_";

    public void assertCanView(
        UUID customerId,
        UUID courierId,
        DeliveryStatus status,
        Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Access denied");
        }
        UUID principalId = UUID.fromString(authentication.getName());

        if (hasRole(authentication, UserRole.ADMIN)) {
            return;
        }
        if (hasRole(authentication, UserRole.CUSTOMER)) {
            if (customerId.equals(principalId)) {
                return;
            }
            throw new AccessDeniedException("Access denied");
        }
        if (hasRole(authentication, UserRole.COURIER)) {
            if (courierId != null && courierId.equals(principalId)) {
                return;
            }
            if (courierId == null && status == DeliveryStatus.CREATED) {
                return;
            }
            throw new AccessDeniedException("Access denied");
        }
        throw new AccessDeniedException("Access denied");
    }

    public void assertAssignedCourier(UUID assignedCourierId, UUID principalId) {
        if (assignedCourierId == null || !assignedCourierId.equals(principalId)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private boolean hasRole(Authentication authentication, UserRole role) {
        String expected = ROLE_PREFIX + role.name();
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (expected.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
