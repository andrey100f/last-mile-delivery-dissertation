package com.ubb.deliveryhub.admin.web;

import com.ubb.deliveryhub.admin.domain.exception.AdminDashboardValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AdminDashboardExceptionHandler {

    @ExceptionHandler(AdminDashboardValidationException.class)
    public ResponseEntity<ProblemDetail> handleValidation(AdminDashboardValidationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("fieldErrors", ex.getFieldErrors());
        return ResponseEntity.badRequest().body(pd);
    }
}
