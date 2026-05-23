package com.ubb.deliveryhub.admin.domain.exception;

import java.io.Serial;

public class InvalidAdminUserPaginationException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InvalidAdminUserPaginationException() {
        super("Pagination is required");
    }
}
