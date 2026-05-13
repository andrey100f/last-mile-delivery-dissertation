package com.ubb.deliveryhub.notification.web;

import com.ubb.deliveryhub.notification.NotificationListDefaults;
import com.ubb.deliveryhub.notification.domain.NotificationType;
import com.ubb.deliveryhub.notification.domain.dto.MarkAllReadResponse;
import com.ubb.deliveryhub.notification.domain.dto.NotificationDto;
import com.ubb.deliveryhub.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public Page<NotificationDto> listForCurrentUser(
        Authentication authentication,
        @PageableDefault(
            size = NotificationListDefaults.PAGE_SIZE,
            sort = NotificationListDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable,
        @RequestParam(required = false) Boolean unreadOnly,
        @RequestParam(required = false) NotificationType type
    ) {
        return notificationService.listForCurrentUser(authentication, pageable, unreadOnly, type);
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Void> markRead(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        notificationService.markReadForCurrentUser(id, authentication);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    @PreAuthorize("hasRole('CUSTOMER')")
    public MarkAllReadResponse markAllRead(Authentication authentication) {
        return notificationService.markAllReadForCurrentUser(authentication);
    }
}
