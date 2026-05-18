package com.ubb.deliveryhub.delivery.application;

import com.ubb.deliveryhub.delivery.application.exception.PermanentMessageProcessingException;
import com.ubb.deliveryhub.delivery.application.exception.TransientMessageProcessingException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.stereotype.Component;

@Component
public class MessageFailureClassifier {

    public FailureType classify(Throwable throwable) {
        if (throwable instanceof PermanentMessageProcessingException) {
            return FailureType.PERMANENT;
        }
        if (throwable instanceof TransientMessageProcessingException
            || throwable instanceof TransientDataAccessException
            || throwable instanceof CannotAcquireLockException
            || throwable instanceof PessimisticLockingFailureException
            || throwable instanceof OptimisticLockingFailureException) {
            return FailureType.TRANSIENT;
        }
        return FailureType.TRANSIENT;
    }

    public enum FailureType {
        TRANSIENT,
        PERMANENT
    }
}
