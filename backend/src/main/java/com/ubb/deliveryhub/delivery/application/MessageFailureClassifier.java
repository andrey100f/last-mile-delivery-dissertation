package com.ubb.deliveryhub.delivery.application;

import com.ubb.deliveryhub.delivery.application.exception.PermanentMessageProcessingException;
import org.springframework.stereotype.Component;

@Component
public class MessageFailureClassifier {

    public FailureType classify(Throwable throwable) {
        if (throwable instanceof PermanentMessageProcessingException) {
            return FailureType.PERMANENT;
        }
        // Unknown failures are treated as transient so they can be retried and inspected safely.
        return FailureType.TRANSIENT;
    }

    public enum FailureType {
        TRANSIENT,
        PERMANENT
    }
}
