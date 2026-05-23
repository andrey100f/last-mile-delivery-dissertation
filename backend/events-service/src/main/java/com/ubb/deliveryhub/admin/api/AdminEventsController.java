package com.ubb.deliveryhub.admin.events.api;

import com.ubb.deliveryhub.admin.events.AdminEventsDefaults;
import com.ubb.deliveryhub.admin.events.api.dto.AdminEventsQueryDto;
import com.ubb.deliveryhub.admin.events.api.dto.AdminSystemEventsPageDto;
import com.ubb.deliveryhub.admin.events.application.AdminEventsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/events")
public class AdminEventsController {

    private final AdminEventsService adminEventsService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public AdminSystemEventsPageDto listEvents(
        @ModelAttribute AdminEventsQueryDto query,
        @PageableDefault(
            size = AdminEventsDefaults.PAGE_SIZE,
            sort = AdminEventsDefaults.SORT_PROPERTY,
            direction = Sort.Direction.DESC
        ) Pageable pageable
    ) {
        return adminEventsService.getEvents(query, pageable);
    }
}
