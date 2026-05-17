package com.ubb.deliveryhub.admin.reports.api;

import com.ubb.deliveryhub.admin.reports.api.dto.AdminDeliveriesByStatusReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminReportsQueryDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminRevenueReportDto;
import com.ubb.deliveryhub.admin.reports.application.AdminReportsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/reports")
public class AdminReportsController {

    private final AdminReportsService adminReportsService;

    @GetMapping("/deliveries-by-status")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDeliveriesByStatusReportDto getDeliveriesByStatus(
        @Valid @ModelAttribute AdminReportsQueryDto query
    ) {
        return adminReportsService.getDeliveriesByStatus(query);
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminRevenueReportDto getRevenueReport(
        @Valid @ModelAttribute AdminReportsQueryDto query
    ) {
        return adminReportsService.getRevenueReport(query);
    }
}
