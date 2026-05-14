package com.ubb.deliveryhub.admin;

/**
 * Defaults for admin-managed user lists; keep {@link #PAGE_SIZE} aligned with
 * {@code spring.data.web.pageable.default-page-size} in {@code application.properties}.
 */
public final class AdminUserListDefaults {

    public static final int PAGE_SIZE = 20;
    public static final String SORT_PROPERTY = "createdAt";

    private AdminUserListDefaults() {
    }
}
