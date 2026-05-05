package com.ubb.deliveryhub.delivery.domain.exception;

import java.io.Serial;

public class InvalidDeliverySortException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InvalidDeliverySortException(String message) {
        super(message);
    }
}
