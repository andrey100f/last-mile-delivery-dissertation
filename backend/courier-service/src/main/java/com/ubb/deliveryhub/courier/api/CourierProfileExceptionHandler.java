package com.ubb.deliveryhub.courier.api;

import com.ubb.deliveryhub.courier.domain.exception.CourierProfileValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CourierProfileExceptionHandler {

    @ExceptionHandler(CourierProfileValidationException.class)
    public ResponseEntity<ProblemDetail> handleValidation(CourierProfileValidationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("errors", ex.getErrors());
        return ResponseEntity.badRequest().body(pd);
    }
}
