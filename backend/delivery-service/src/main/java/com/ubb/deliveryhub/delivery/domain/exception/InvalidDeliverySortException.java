package com.ubb.deliveryhub.delivery.domain.exception;

import java.io.Serial;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

public class InvalidDeliverySortException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String invalidProperty;
    private final List<String> allowedProperties;

    public InvalidDeliverySortException(String invalidProperty, Collection<String> allowedProperties) {
        super(buildDetail(invalidProperty, allowedProperties));
        this.invalidProperty = invalidProperty;
        this.allowedProperties = sortedCopy(allowedProperties);
    }

    public String getInvalidProperty() {
        return invalidProperty;
    }

    public List<String> getAllowedProperties() {
        return allowedProperties;
    }

    private static String buildDetail(String invalidProperty, Collection<String> allowedProperties) {
        return "Invalid sort property: %s. Allowed: %s".formatted(invalidProperty, String.join(", ", sortedCopy(allowedProperties)));
    }

    private static List<String> sortedCopy(Collection<String> allowedProperties) {
        List<String> copy = new ArrayList<>(allowedProperties);
        copy.sort(Comparator.naturalOrder());
        return List.copyOf(copy);
    }
}
