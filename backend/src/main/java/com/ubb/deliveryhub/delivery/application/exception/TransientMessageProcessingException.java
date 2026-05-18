package com.ubb.deliveryhub.delivery.application.exception;

public class TransientMessageProcessingException extends RuntimeException {

    public TransientMessageProcessingException(String message) {
        super(message);
    }
}
