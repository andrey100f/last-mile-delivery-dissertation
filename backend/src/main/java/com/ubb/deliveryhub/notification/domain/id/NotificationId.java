package com.ubb.deliveryhub.notification.domain.id;

public final class NotificationId {

    public static final String TABLE_NAME = "notifications";

    public static final String IDX_USER_CREATED_AT_DESC = "idx_notifications_user_created_at_desc";
    public static final String IDX_USER_READ_AT = "idx_notifications_user_read_at";

    public static final String USER_ID = "user_id";
    public static final String DELIVERY_ID = "delivery_id";
    public static final String TYPE = "type";
    public static final String CATEGORY = "category";
    public static final String TITLE = "title";
    public static final String MESSAGE = "message";
    public static final String PAYLOAD_JSON = "payload_json";
    public static final String CREATED_AT = "created_at";
    public static final String READ_AT = "read_at";

    private NotificationId() {
        throw new IllegalStateException("Constants only class");
    }
}
