package com.ubb.deliveryhub.courier.domain.exception;

import com.ubb.deliveryhub.common.exception.EntityNotFoundException;

import java.io.Serial;

public class CourierProfileNotFoundException extends EntityNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public CourierProfileNotFoundException() {
        super("Courier profile not found");
    }
}
