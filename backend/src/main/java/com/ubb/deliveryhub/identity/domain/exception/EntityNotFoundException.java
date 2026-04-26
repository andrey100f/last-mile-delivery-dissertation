package com.ubb.deliveryhub.identity.domain.exception;

import java.io.Serial;
import java.io.Serializable;

public class EntityNotFoundException extends RuntimeException implements Serializable {

    @Serial
    private static final long serialVersionUID = 7432702726315338934L;

    public EntityNotFoundException(String message) {
        super(message);
    }

}
