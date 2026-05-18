package com.ubb.deliveryhub.courier.api;

import com.ubb.deliveryhub.courier.domain.exception.CourierEarningsValidationException;
import com.ubb.deliveryhub.courier.domain.exception.InvalidCourierEarningsSortException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = CourierEarningsController.class)
public class CourierEarningsExceptionHandler {

    @ExceptionHandler(CourierEarningsValidationException.class)
    public ResponseEntity<ProblemDetail> handleValidation(CourierEarningsValidationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("errors", ex.getErrors());
        pd.setProperty("code", "COURIER_EARNINGS_VALIDATION_ERROR");
        return ResponseEntity.badRequest().body(pd);
    }

    @ExceptionHandler(InvalidCourierEarningsSortException.class)
    public ResponseEntity<ProblemDetail> handleInvalidSort(InvalidCourierEarningsSortException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("invalidSortProperty", ex.getInvalidProperty());
        pd.setProperty("allowedSortProperties", ex.getAllowedProperties());
        pd.setProperty("code", "COURIER_EARNINGS_SORT_ERROR");
        return ResponseEntity.badRequest().body(pd);
    }
}
