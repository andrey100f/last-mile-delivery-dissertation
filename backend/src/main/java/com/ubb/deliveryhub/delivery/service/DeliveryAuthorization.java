package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.delivery.domain.Delivery;
import com.ubb.deliveryhub.identity.domain.User;
import com.ubb.deliveryhub.identity.domain.embedded.UserRole;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Centralized delivery visibility rules (#32); reuse for WebSocket subscription gates (#43).
 * Policy: missing delivery → {@link com.ubb.deliveryhub.delivery.domain.exception.DeliveryNotFoundException}
 * before authorization; wrong principal → 403 (does not hide existence from enumeration — use 404 for both if needed).
 */
@Component
public class DeliveryAuthorization {

    private static final String ROLE_PREFIX = "ROLE_";

    public void assertCanView(Delivery delivery, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Access denied");
        }
        UUID principalId = UUID.fromString(authentication.getName());

        if (hasRole(authentication, UserRole.ADMIN)) {
            return;
        }
        if (hasRole(authentication, UserRole.CUSTOMER)) {
            if (delivery.getCustomer().getId().equals(principalId)) {
                return;
            }
            throw new AccessDeniedException("Access denied");
        }
        if (hasRole(authentication, UserRole.COURIER)) {
            User assigned = delivery.getCourier();
            if (assigned != null && assigned.getId().equals(principalId)) {
                return;
            }
            throw new AccessDeniedException("Access denied");
        }
        throw new AccessDeniedException("Access denied");
    }

    private boolean hasRole(Authentication authentication, UserRole role) {
        String expected = ROLE_PREFIX + role.name();
        for (GrantedAuthority a : authentication.getAuthorities()) {
            if (expected.equals(a.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
