package com.ubb.deliveryhub.notification.application;

import com.ubb.deliveryhub.notification.application.exception.PermanentNotificationMessageException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.stereotype.Component;

import java.sql.SQLTransientException;

@Component
public class NotificationMessageFailureClassifier {

    public FailureType classify(Throwable throwable) {
        if (throwable instanceof PermanentNotificationMessageException
            || throwable instanceof IllegalArgumentException) {
            return FailureType.PERMANENT;
        }
        if (throwable instanceof TransientDataAccessException
            || throwable instanceof QueryTimeoutException
            || throwable instanceof CannotAcquireLockException
            || hasCause(throwable, SQLTransientException.class)) {
            return FailureType.TRANSIENT;
        }
        // Unknown failures are retried first so operators can inspect exhausted messages in DLQ.
        return FailureType.TRANSIENT;
    }

    private static boolean hasCause(Throwable throwable, Class<? extends Throwable> expectedType) {
        Throwable cursor = throwable;
        while (cursor != null) {
            if (expectedType.isInstance(cursor)) {
                return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    public enum FailureType {
        TRANSIENT,
        PERMANENT
    }
}
