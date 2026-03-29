package com.ubb.deliveryhub.identity.domain.id;

public class UserId {

    public static final String TABLE_NAME = "users";
    public static final String EMAIL = "email";
    public static final String PASSWORD_HASH = "password_hash";
    public static final String ROLE = "role";
    public static final String CREATED_AT = "created_at";
    public static final String UPDATED_AT = "updated_at";

    private UserId() {
        throw new IllegalStateException("Constants only class");
    }

}
