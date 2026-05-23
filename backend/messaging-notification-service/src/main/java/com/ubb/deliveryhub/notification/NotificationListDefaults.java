package com.ubb.deliveryhub.notification;

/**
 * Defaults for {@code GET /notifications}; keep {@link #PAGE_SIZE} aligned with
 * {@code spring.data.web.pageable.default-page-size} in {@code application.properties}.
 */
public final class NotificationListDefaults {

    public static final int PAGE_SIZE = 20;
    public static final String SORT_PROPERTY = "createdAt";

    private NotificationListDefaults() {
    }
}
