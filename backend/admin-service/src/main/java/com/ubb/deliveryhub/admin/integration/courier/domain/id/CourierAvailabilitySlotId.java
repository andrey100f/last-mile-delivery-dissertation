package com.ubb.deliveryhub.admin.integration.courier.domain.id;

public final class CourierAvailabilitySlotId {

    public static final String TABLE_NAME = "courier_availability_slots";

    public static final String COURIER_PROFILE_ID = "courier_profile_id";
    public static final String DAY_OF_WEEK = "day_of_week";
    public static final String START_TIME = "start_time";
    public static final String END_TIME = "end_time";

    private CourierAvailabilitySlotId() {
        throw new IllegalStateException("Constants only class");
    }
}
