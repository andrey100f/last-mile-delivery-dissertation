package com.ubb.deliveryhub.admin.events.api;

import com.ubb.deliveryhub.admin.events.domain.exception.AdminEventsValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AdminEventsController.class)
public class AdminEventsExceptionHandler {

    @ExceptionHandler(AdminEventsValidationException.class)
    public ResponseEntity<ProblemDetail> handleValidation(AdminEventsValidationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("errors", ex.getErrors());
        pd.setProperty("code", "ADMIN_EVENTS_VALIDATION_ERROR");
        return ResponseEntity.badRequest().body(pd);
    }
}
