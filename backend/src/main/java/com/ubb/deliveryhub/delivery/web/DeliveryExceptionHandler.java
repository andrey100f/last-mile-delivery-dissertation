package com.ubb.deliveryhub.delivery.web;

import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliverySortException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class DeliveryExceptionHandler {

    @ExceptionHandler(InvalidDeliverySortException.class)
    public ResponseEntity<ProblemDetail> handleInvalidDeliverySort(InvalidDeliverySortException ex) {
        return ResponseEntity.badRequest()
            .body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }
}
