package com.ubb.deliveryhub.delivery.domain.exception;

import java.io.Serial;

public class DeliveryTakenException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public DeliveryTakenException() {
        super("Delivery is no longer available for acceptance");
    }
}
