package com.ubb.deliveryhub.events.domain;

import java.util.Locale;
import java.util.Optional;

public enum SystemEventType {
    DELIVERY_ASSIGNED,
    DELIVERY_STATUS_CHANGED,
    EXCEPTION_CREATED,
    EXCEPTION_RESOLVED,
    LOGIN_FAILED;

    public static Optional<SystemEventType> fromRaw(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(SystemEventType.valueOf(raw.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
