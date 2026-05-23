package com.ubb.deliveryhub.admin.web;

import com.ubb.deliveryhub.admin.domain.exception.AdminUserEmailConflictException;
import com.ubb.deliveryhub.admin.domain.exception.InvalidAdminUserPaginationException;
import com.ubb.deliveryhub.admin.domain.exception.InvalidAdminUserSortException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class AdminUserManagementExceptionHandler {

    @ExceptionHandler(InvalidAdminUserSortException.class)
    public ResponseEntity<ProblemDetail> handleInvalidSort(InvalidAdminUserSortException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setProperty("invalidSortProperty", ex.getInvalidProperty());
        pd.setProperty("allowedSortProperties", ex.getAllowedProperties());
        return ResponseEntity.badRequest().body(pd);
    }

    @ExceptionHandler(InvalidAdminUserPaginationException.class)
    public ResponseEntity<ProblemDetail> handleInvalidPagination(InvalidAdminUserPaginationException ex) {
        return ResponseEntity.badRequest()
            .body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(AdminUserEmailConflictException.class)
    public ResponseEntity<ProblemDetail> handleEmailConflict(AdminUserEmailConflictException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        pd.setProperty("code", "USER_EMAIL_CONFLICT");
        pd.setProperty("fieldErrors", Map.of("email", List.of("Email is already in use")));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
    }
}
