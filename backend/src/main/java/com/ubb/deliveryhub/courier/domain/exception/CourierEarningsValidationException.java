package com.ubb.deliveryhub.courier.domain.exception;

import java.util.List;
import java.util.Map;

public class CourierEarningsValidationException extends RuntimeException {

    private final Map<String, List<String>> errors;

    public CourierEarningsValidationException(String message, Map<String, List<String>> errors) {
        super(message);
        this.errors = errors;
    }

    public Map<String, List<String>> getErrors() {
        return errors;
    }
}
