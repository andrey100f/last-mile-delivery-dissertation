package com.ubb.deliveryhub.notification.domain.exception;

import com.ubb.deliveryhub.identity.domain.exception.EntityNotFoundException;

import java.io.Serial;

public class NotificationNotFoundException extends EntityNotFoundException {

    @Serial
    private static final long serialVersionUID = 1L;

    public NotificationNotFoundException() {
        super("Notification not found");
    }
}
