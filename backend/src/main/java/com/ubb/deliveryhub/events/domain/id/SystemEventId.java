package com.ubb.deliveryhub.events.domain.id;

public final class SystemEventId {

    public static final String TABLE_NAME = "system_events";

    public static final String IDX_CREATED_AT_ID_DESC = "idx_system_events_created_at_id_desc";
    public static final String IDX_TYPE_CREATED_AT_ID_DESC = "idx_system_events_type_created_at_id_desc";

    public static final String TYPE = "type";
    public static final String ACTOR_TYPE = "actor_type";
    public static final String ACTOR_ID = "actor_id";
    public static final String TARGET_TYPE = "target_type";
    public static final String TARGET_ID = "target_id";
    public static final String METADATA = "metadata";
    public static final String CREATED_AT = "created_at";

    private SystemEventId() {
        throw new IllegalStateException("Constants only class");
    }
}
