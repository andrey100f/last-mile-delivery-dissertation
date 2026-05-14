package com.ubb.deliveryhub.admin.domain.exception;

import lombok.Getter;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Getter
public class AdminDashboardValidationException extends RuntimeException {

    private final Map<String, List<String>> fieldErrors;

    public AdminDashboardValidationException(String message, Map<String, List<String>> fieldErrors) {
        super(message);
        this.fieldErrors = Collections.unmodifiableMap(new LinkedHashMap<>(fieldErrors));
    }
}
