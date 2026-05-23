package com.ubb.deliveryhub.notification.repository;

import com.ubb.deliveryhub.common.domain.User;
import com.ubb.deliveryhub.notification.domain.Notification;
import com.ubb.deliveryhub.notification.domain.NotificationType;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class NotificationSpecifications {

    private NotificationSpecifications() {
    }

    public static Specification<Notification> forUserWithFilters(
        UUID userId,
        Boolean unreadOnly,
        NotificationType type
    ) {
        return (root, query, cb) -> {
            Join<Notification, User> userJoin = root.join("user", JoinType.INNER);
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(userJoin.get("id"), userId));
            if (Boolean.TRUE.equals(unreadOnly)) {
                predicates.add(cb.isNull(root.get("readAt")));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
