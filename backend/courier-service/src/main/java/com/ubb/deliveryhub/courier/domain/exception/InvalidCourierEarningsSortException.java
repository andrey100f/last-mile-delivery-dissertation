package com.ubb.deliveryhub.courier.domain.exception;

import java.util.Set;

public class InvalidCourierEarningsSortException extends RuntimeException {

    private final String invalidProperty;
    private final Set<String> allowedProperties;

    public InvalidCourierEarningsSortException(String invalidProperty, Set<String> allowedProperties) {
        super(
            "Unsupported courier earnings sort property '%s'. Allowed: %s"
                .formatted(invalidProperty, String.join(", ", allowedProperties))
        );
        this.invalidProperty = invalidProperty;
        this.allowedProperties = Set.copyOf(allowedProperties);
    }

    public String getInvalidProperty() {
        return invalidProperty;
    }

    public Set<String> getAllowedProperties() {
        return allowedProperties;
    }
}
