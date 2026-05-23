package com.ubb.deliveryhub.notification.web;

import com.ubb.deliveryhub.notification.domain.exception.InvalidNotificationSortException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class NotificationExceptionHandler {

    @ExceptionHandler(InvalidNotificationSortException.class)
    public ResponseEntity<ProblemDetail> handleInvalidSort(InvalidNotificationSortException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("invalidSortProperty", ex.getInvalidProperty());
        pd.setProperty("allowedSortProperties", ex.getAllowedProperties());
        return ResponseEntity.badRequest().body(pd);
    }
}
