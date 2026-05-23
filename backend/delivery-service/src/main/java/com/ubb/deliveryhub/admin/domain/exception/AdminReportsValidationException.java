package com.ubb.deliveryhub.admin.reports.domain.exception;

import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
public class AdminReportsValidationException extends RuntimeException {

    private final Map<String, List<String>> errors;

    public AdminReportsValidationException(String message, Map<String, List<String>> errors) {
        super(message);
        this.errors = errors;
    }
}
