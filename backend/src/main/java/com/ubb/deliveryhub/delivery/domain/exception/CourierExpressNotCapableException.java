package com.ubb.deliveryhub.delivery.domain.exception;

import java.io.Serial;

public class CourierExpressNotCapableException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public CourierExpressNotCapableException() {
        super("Courier is not enabled for express deliveries");
    }
}
