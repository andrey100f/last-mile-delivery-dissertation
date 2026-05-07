package com.ubb.deliveryhub.delivery.web;

import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliveryPaginationException;
import com.ubb.deliveryhub.delivery.domain.exception.InvalidDeliverySortException;
import com.ubb.deliveryhub.delivery.domain.exception.DeliveryTakenException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class DeliveryExceptionHandler {

    @ExceptionHandler(InvalidDeliverySortException.class)
    public ResponseEntity<ProblemDetail> handleInvalidDeliverySort(InvalidDeliverySortException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("invalidSortProperty", ex.getInvalidProperty());
        pd.setProperty("allowedSortProperties", ex.getAllowedProperties());
        return ResponseEntity.badRequest().body(pd);
    }

    @ExceptionHandler(InvalidDeliveryPaginationException.class)
    public ResponseEntity<ProblemDetail> handleInvalidDeliveryPagination(InvalidDeliveryPaginationException ex) {
        return ResponseEntity.badRequest()
            .body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(DeliveryTakenException.class)
    public ResponseEntity<ProblemDetail> handleDeliveryTaken(DeliveryTakenException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setProperty("code", "DELIVERY_TAKEN");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
    }
}
