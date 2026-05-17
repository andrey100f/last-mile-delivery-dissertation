package com.ubb.deliveryhub.admin.reports.api;

import com.ubb.deliveryhub.admin.reports.api.dto.AdminDeliveriesByStatusReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminExceptionsReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminReportsQueryDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminRevenueReportDto;
import com.ubb.deliveryhub.admin.reports.application.AdminReportsCsvExporter;
import com.ubb.deliveryhub.admin.reports.application.AdminReportsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    private final AdminReportsCsvExporter reportsCsvExporter;

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

    @GetMapping("/exceptions")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminExceptionsReportDto getExceptionsReport(
        @Valid @ModelAttribute AdminReportsQueryDto query
    ) {
        return adminReportsService.getExceptionsReport(query);
    }

    @GetMapping(value = "/deliveries-by-status/export", produces = "text/csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportDeliveriesByStatus(
        @Valid @ModelAttribute AdminReportsQueryDto query
    ) {
        AdminDeliveriesByStatusReportDto report = adminReportsService.getDeliveriesByStatus(query);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=deliveries-by-status.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(reportsCsvExporter.toDeliveriesByStatusCsv(report));
    }

    @GetMapping(value = "/revenue/export", produces = "text/csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportRevenue(
        @Valid @ModelAttribute AdminReportsQueryDto query
    ) {
        AdminRevenueReportDto report = adminReportsService.getRevenueReport(query);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=revenue-report.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(reportsCsvExporter.toRevenueCsv(report));
    }

    @GetMapping(value = "/exceptions/export", produces = "text/csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportExceptions(
        @Valid @ModelAttribute AdminReportsQueryDto query
    ) {
        AdminExceptionsReportDto report = adminReportsService.getExceptionsReport(query);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=exceptions-report.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(reportsCsvExporter.toExceptionsCsv(report));
    }
}
