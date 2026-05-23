package com.ubb.deliveryhub.delivery.domain.exception;

import java.io.Serial;

/**
 * Raised when the client requests an unpaged result (e.g. {@code unpaged=true}), which would load
 * an unbounded row set.
 */
public class InvalidDeliveryPaginationException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public InvalidDeliveryPaginationException() {
        super("Paged query parameters are required (page and size). Unpaged listings are not supported.");
    }
}
