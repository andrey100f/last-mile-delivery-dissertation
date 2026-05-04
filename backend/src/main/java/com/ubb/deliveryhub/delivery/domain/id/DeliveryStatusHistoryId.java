package com.ubb.deliveryhub.delivery.domain.id;

public final class DeliveryStatusHistoryId {

    public static final String TABLE_NAME = "delivery_status_history";

    public static final String DELIVERY_ID = "delivery_id";
    public static final String STATUS = "status";
    public static final String RECORDED_AT = "recorded_at";
    public static final String NOTE = "note";
    public static final String ACTOR_USER_ID = "actor_user_id";

    private DeliveryStatusHistoryId() {
        throw new IllegalStateException("Constants only class");
    }
}
