package com.ubb.deliveryhub.delivery.application.exception;

public class PermanentMessageProcessingException extends RuntimeException {

    private final String reason;

    public PermanentMessageProcessingException(String reason, String message) {
        super(message);
        this.reason = reason;
    }

    public String reason() {
        return reason;
    }
}
