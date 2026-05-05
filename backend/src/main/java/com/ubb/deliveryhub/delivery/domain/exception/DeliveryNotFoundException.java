package com.ubb.deliveryhub.delivery.domain.exception;

import com.ubb.deliveryhub.identity.domain.exception.EntityNotFoundException;

import java.io.Serial;

public class DeliveryNotFoundException extends EntityNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public DeliveryNotFoundException() {
        super("Delivery not found");
    }
}
