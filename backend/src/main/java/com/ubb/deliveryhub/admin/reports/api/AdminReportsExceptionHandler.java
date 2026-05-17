package com.ubb.deliveryhub.admin.reports.api;

import com.ubb.deliveryhub.admin.reports.domain.exception.AdminReportsValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class AdminReportsExceptionHandler {

    @ExceptionHandler(AdminReportsValidationException.class)
    public ResponseEntity<ProblemDetail> handleReportsValidation(AdminReportsValidationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("errors", ex.getErrors());
        pd.setProperty("code", "REPORTS_VALIDATION_ERROR");
        return ResponseEntity.badRequest().body(pd);
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ProblemDetail> handleBind(BindException ex) {
        Map<String, List<String>> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fieldError ->
            errors.computeIfAbsent(fieldError.getField(), _ignored -> new ArrayList<>())
                .add(fieldError.getDefaultMessage())
        );

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid reports query");
        pd.setProperty("errors", errors);
        pd.setProperty("code", "REPORTS_VALIDATION_ERROR");
        return ResponseEntity.badRequest().body(pd);
    }
}
