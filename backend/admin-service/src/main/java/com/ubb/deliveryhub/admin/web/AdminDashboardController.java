package com.ubb.deliveryhub.admin.web;

import com.ubb.deliveryhub.admin.domain.dto.AdminDashboardDto;
import com.ubb.deliveryhub.admin.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDashboardDto getDashboard(
        Authentication authentication,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestHeader(value = "X-Request-Id", required = false) String requestId
    ) {
        return adminDashboardService.getDashboard(from, to, authentication, requestId);
    }
}
