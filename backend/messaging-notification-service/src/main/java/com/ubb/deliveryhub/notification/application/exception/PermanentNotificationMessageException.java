package com.ubb.deliveryhub.notification.application.exception;

public class PermanentNotificationMessageException extends RuntimeException {

    private final String reason;

    public PermanentNotificationMessageException(String reason, String message) {
        super(message);
        this.reason = reason;
    }

    public PermanentNotificationMessageException(String reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public String reason() {
        return reason;
    }
}
