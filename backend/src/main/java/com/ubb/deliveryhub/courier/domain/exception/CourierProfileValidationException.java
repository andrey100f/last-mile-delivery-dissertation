package com.ubb.deliveryhub.courier.domain.exception;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public class CourierProfileValidationException extends RuntimeException {

    private final Map<String, List<String>> errors;

    public CourierProfileValidationException(String message, Map<String, List<String>> errors) {
        super(message);
        this.errors = Collections.unmodifiableMap(errors);
    }

    public Map<String, List<String>> getErrors() {
        return errors;
    }
}
