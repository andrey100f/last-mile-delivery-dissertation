package com.ubb.deliveryhub.notification.service;

import com.ubb.deliveryhub.notification.NotificationListDefaults;
import com.ubb.deliveryhub.notification.domain.Notification;
import com.ubb.deliveryhub.notification.domain.NotificationType;
import com.ubb.deliveryhub.notification.domain.dto.MarkAllReadResponse;
import com.ubb.deliveryhub.notification.domain.dto.NotificationDto;
import com.ubb.deliveryhub.notification.domain.exception.InvalidNotificationSortException;
import com.ubb.deliveryhub.notification.domain.exception.NotificationNotFoundException;
import com.ubb.deliveryhub.notification.repository.NotificationRepository;
import com.ubb.deliveryhub.notification.repository.NotificationSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of("createdAt", "readAt", "type", "category");

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public Page<NotificationDto> listForCurrentUser(
        Authentication authentication,
        Pageable pageable,
        Boolean unreadOnly,
        NotificationType type
    ) {
        Pageable effective = applyDefaultSort(pageable);
        assertAllowedSort(effective.getSort());
        UUID userId = principalUserId(authentication);
        Specification<Notification> specification = NotificationSpecifications.forUserWithFilters(userId, unreadOnly, type);
        return notificationRepository.findAll(specification, effective).map(NotificationMapper::toDto);
    }

    @Transactional
    public void markReadForCurrentUser(UUID notificationId, Authentication authentication) {
        UUID userId = principalUserId(authentication);
        Instant now = Instant.now();
        int updated = notificationRepository.markReadIfUnread(notificationId, userId, now);
        if (updated > 0) {
            return;
        }
        if (!notificationRepository.existsByIdAndUser_Id(notificationId, userId)) {
            throw new NotificationNotFoundException();
        }
    }

    @Transactional
    public MarkAllReadResponse markAllReadForCurrentUser(Authentication authentication) {
        UUID userId = principalUserId(authentication);
        int updatedCount = notificationRepository.markAllRead(userId, Instant.now());
        return MarkAllReadResponse.builder()
            .updatedCount(updatedCount)
            .build();
    }

    private static UUID principalUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private static void assertAllowedSort(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        for (Sort.Order order : sort) {
            if (!ALLOWED_SORT_PROPERTIES.contains(order.getProperty())) {
                throw new InvalidNotificationSortException(order.getProperty(), ALLOWED_SORT_PROPERTIES);
            }
        }
    }

    private static Pageable applyDefaultSort(Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return PageRequest.of(
                0,
                NotificationListDefaults.PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, NotificationListDefaults.SORT_PROPERTY)
            );
        }
        if (!pageable.getSort().isUnsorted()) {
            return pageable;
        }
        return PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Direction.DESC, NotificationListDefaults.SORT_PROPERTY)
        );
    }
}
