package com.ubb.deliveryhub.messaging.domain.id;

public final class ProcessedMessageId {

    public static final String TABLE_NAME = "processed_messages";
    public static final String IDX_CONSUMER_EVENT_UNIQUE = "idx_processed_messages_consumer_event_unique";
    public static final String IDX_DELIVERY_ID = "idx_processed_messages_delivery_id";

    public static final String CONSUMER_NAME = "consumer_name";
    public static final String EVENT_ID = "event_id";
    public static final String DELIVERY_ID = "delivery_id";
    public static final String OUTCOME = "outcome";
    public static final String PROCESSED_AT = "processed_at";
    public static final String CREATED_AT = "created_at";

    private ProcessedMessageId() {
        throw new IllegalStateException("Constants only class");
    }
}
