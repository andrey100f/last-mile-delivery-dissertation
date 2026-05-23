package com.ubb.deliveryhub.admin.integration.courier.domain.id;

public final class CourierProfileId {

    public static final String TABLE_NAME = "courier_profiles";

    public static final String USER_ID = "user_id";
    public static final String DISPLAY_NAME = "display_name";
    public static final String PHONE = "phone";
    public static final String VEHICLE_TYPE = "vehicle_type";
    public static final String VEHICLE_PLATE = "vehicle_plate";
    public static final String VEHICLE_CAPACITY_KG = "vehicle_capacity_kg";
    public static final String VEHICLE_CAPACITY_LITERS = "vehicle_capacity_liters";
    public static final String AVAILABLE_NOW = "available_now";
    public static final String MAX_DISTANCE_KM = "max_distance_km";
    public static final String EXPRESS_CAPABLE = "express_capable";
    public static final String CREATED_AT = "created_at";
    public static final String UPDATED_AT = "updated_at";
    public static final String VERSION = "version";

    private CourierProfileId() {
        throw new IllegalStateException("Constants only class");
    }
}
