package com.ubb.deliveryhub.identity.domain.exception;

import java.io.Serial;

public class AuthException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 8138174567182170609L;

    public AuthException(String message) {
        super(message);
    }

}
