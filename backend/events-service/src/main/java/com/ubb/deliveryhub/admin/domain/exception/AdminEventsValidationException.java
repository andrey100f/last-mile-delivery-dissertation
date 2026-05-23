package com.ubb.deliveryhub.admin.events.domain.exception;

import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
public class AdminEventsValidationException extends RuntimeException {

    private final Map<String, List<String>> errors;

    public AdminEventsValidationException(String message, Map<String, List<String>> errors) {
        super(message);
        this.errors = errors;
    }
}
