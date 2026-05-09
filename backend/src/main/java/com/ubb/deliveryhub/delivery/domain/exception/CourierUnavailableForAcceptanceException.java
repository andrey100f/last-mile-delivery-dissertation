package com.ubb.deliveryhub.delivery.domain.exception;

import java.io.Serial;

public class CourierUnavailableForAcceptanceException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public CourierUnavailableForAcceptanceException() {
        super("Courier is not available to accept deliveries");
    }
}
