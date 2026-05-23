package com.ubb.deliveryhub.admin.domain.exception;

import java.io.Serial;

public class AdminUserEmailConflictException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String email;

    public AdminUserEmailConflictException(String email) {
        super("A user with this email already exists");
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
