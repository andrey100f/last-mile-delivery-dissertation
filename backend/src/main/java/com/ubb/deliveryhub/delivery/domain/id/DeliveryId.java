package com.ubb.deliveryhub.delivery.domain.id;

public final class DeliveryId {

    public static final String TABLE_NAME = "deliveries";

    public static final String IDX_CUSTOMER_STATUS = "idx_deliveries_customer_status";
    public static final String IDX_COURIER_STATUS = "idx_deliveries_courier_status";

    public static final String TRACKING_CODE = "tracking_code";
    public static final String CUSTOMER_ID = "customer_id";
    public static final String COURIER_ID = "courier_id";
    public static final String STATUS = "status";
    public static final String DELIVERY_TYPE = "delivery_type";

    public static final String PICKUP_LINE1 = "pickup_line1";
    public static final String PICKUP_CONTACT_NAME = "pickup_contact_name";
    public static final String PICKUP_CONTACT_PHONE = "pickup_contact_phone";

    public static final String DESTINATION_LINE1 = "destination_line1";
    public static final String DESTINATION_CONTACT_NAME = "destination_contact_name";
    public static final String DESTINATION_CONTACT_PHONE = "destination_contact_phone";

    public static final String PACKAGE_WEIGHT_KG = "package_weight_kg";
    public static final String PACKAGE_DESCRIPTION = "package_description";

    public static final String BASE_AMOUNT = "base_amount";
    public static final String FEE_AMOUNT = "fee_amount";
    public static final String TAX_AMOUNT = "tax_amount";
    public static final String TOTAL_AMOUNT = "total_amount";

    public static final String CURRENCY = "currency";
    public static final String SPECIAL_INSTRUCTIONS = "special_instructions";
    public static final String CREATED_AT = "created_at";
    public static final String UPDATED_AT = "updated_at";
    public static final String VERSION = "version";

    private DeliveryId() {
        throw new IllegalStateException("Constants only class");
    }
}
