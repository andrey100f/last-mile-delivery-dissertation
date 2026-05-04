package com.ubb.deliveryhub.delivery.domain.id;

/**
 * Column names for {@link com.ubb.deliveryhub.delivery.domain.embedded.AddressContact}.
 * Prefixes (pickup_/destination_) are applied on {@code Delivery} via {@code @AttributeOverride}.
 */
public final class AddressContactId {

    public static final String LINE1 = "line1";
    public static final String LINE2 = "line2";
    public static final String CITY = "city";
    public static final String REGION = "region";
    public static final String POSTAL_CODE = "postal_code";
    public static final String COUNTRY = "country";
    public static final String CONTACT_NAME = "contact_name";
    public static final String CONTACT_PHONE = "contact_phone";

    /**
     * Property names on the embeddable type for {@link jakarta.persistence.AttributeOverride#name()}.
     */
    public static final class Property {
        public static final String LINE1 = "line1";
        public static final String LINE2 = "line2";
        public static final String CITY = "city";
        public static final String REGION = "region";
        public static final String POSTAL_CODE = "postalCode";
        public static final String COUNTRY = "country";
        public static final String CONTACT_NAME = "contactName";
        public static final String CONTACT_PHONE = "contactPhone";

        private Property() {
            throw new IllegalStateException("Constants only class");
        }
    }

    private AddressContactId() {
        throw new IllegalStateException("Constants only class");
    }
}
