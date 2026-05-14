package com.ubb.deliveryhub.admin.service;

import com.ubb.deliveryhub.admin.domain.dto.AdminDashboardDto;
import com.ubb.deliveryhub.admin.domain.dto.AdminDashboardSeriesPointDto;
import com.ubb.deliveryhub.admin.domain.dto.AdminDashboardWindowDto;
import com.ubb.deliveryhub.admin.domain.exception.AdminDashboardValidationException;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.repository.DeliveryDateCountView;
import com.ubb.deliveryhub.delivery.repository.DeliveryRepository;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusCountView;
import com.ubb.deliveryhub.notification.domain.NotificationCategory;
import com.ubb.deliveryhub.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Log4j2
public class AdminDashboardService {

    private static final Duration DEFAULT_WINDOW_SIZE = Duration.ofDays(7);
    private static final Duration MAX_ALLOWED_WINDOW_SIZE = Duration.ofDays(31);
    private static final String WINDOW_TIMEZONE = "UTC";
    private static final String DEFAULT_REVENUE_CURRENCY = "RON";
    private static final Set<DeliveryStatus> ACTIVE_DELIVERY_STATUSES = Set.of(
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT
    );
    private static final Set<DeliveryStatus> REVENUE_DELIVERY_STATUSES = Set.of(DeliveryStatus.DELIVERED);

    private final DeliveryRepository deliveryRepository;
    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public AdminDashboardDto getDashboard(String fromRaw, String toRaw, Authentication authentication, String requestId) {
        DashboardWindow window = resolveWindow(fromRaw, toRaw);
        String adminUserId = authentication != null ? authentication.getName() : "unknown";
        String normalizedRequestId = (requestId == null || requestId.isBlank()) ? "n/a" : requestId;

        log.info(
            "Admin dashboard access: adminUserId={}, from={}, to={}, timezone={}, requestId={}",
            adminUserId,
            window.fromInclusive(),
            window.toExclusive(),
            WINDOW_TIMEZONE,
            normalizedRequestId
        );

        long activeDeliveriesCount = deliveryRepository.countByStatusesInCreatedWindow(
            ACTIVE_DELIVERY_STATUSES,
            window.fromInclusive(),
            window.toExclusive()
        );

        long couriersOnlineCount = deliveryRepository.countDistinctCouriersByStatusesInCreatedWindow(
            ACTIVE_DELIVERY_STATUSES,
            window.fromInclusive(),
            window.toExclusive()
        );

        BigDecimal revenueTotal = deliveryRepository.sumRevenueByStatusesInCreatedWindow(
            REVENUE_DELIVERY_STATUSES,
            window.fromInclusive(),
            window.toExclusive()
        );

        String revenueCurrency = resolveRevenueCurrency(window);

        long exceptionBacklogCount = notificationRepository.countUnreadByCategoryInWindow(
            NotificationCategory.EXCEPTION,
            window.fromInclusive(),
            window.toExclusive()
        );

        List<AdminDashboardSeriesPointDto> deliveryVolumeSeries = buildDeliveryVolumeSeries(window);
        List<AdminDashboardSeriesPointDto> statusDistributionSeries = buildStatusDistributionSeries(window);

        return AdminDashboardDto.builder()
            .activeDeliveriesCount(activeDeliveriesCount)
            .couriersOnlineCount(couriersOnlineCount)
            .revenueTotal(revenueTotal)
            .revenueCurrency(revenueCurrency)
            .exceptionBacklogCount(exceptionBacklogCount)
            .generatedAt(Instant.now())
            .window(
                AdminDashboardWindowDto.builder()
                    .from(window.fromInclusive())
                    .to(window.toExclusive())
                    .timezone(WINDOW_TIMEZONE)
                    .build()
            )
            .deliveryVolumeSeries(deliveryVolumeSeries)
            .statusDistributionSeries(statusDistributionSeries)
            .build();
    }

    private String resolveRevenueCurrency(DashboardWindow window) {
        List<String> currencies = deliveryRepository.findRevenueCurrenciesByStatusesInCreatedWindow(
            REVENUE_DELIVERY_STATUSES,
            window.fromInclusive(),
            window.toExclusive()
        );
        if (currencies == null || currencies.isEmpty() || currencies.get(0) == null || currencies.get(0).isBlank()) {
            return DEFAULT_REVENUE_CURRENCY;
        }
        return currencies.get(0);
    }

    private DashboardWindow resolveWindow(String fromRaw, String toRaw) {
        Instant now = Instant.now();
        Instant toExclusive = parseToBoundary(toRaw, "to");
        if (toExclusive == null) {
            toExclusive = now;
        }

        Instant fromInclusive = parseFromBoundary(fromRaw, "from");
        if (fromInclusive == null) {
            fromInclusive = toExclusive.minus(DEFAULT_WINDOW_SIZE);
        }

        Map<String, List<String>> errors = new LinkedHashMap<>();
        if (!fromInclusive.isBefore(toExclusive)) {
            errors.put("from", List.of("'from' must be before 'to'"));
        }

        Duration span = Duration.between(fromInclusive, toExclusive);
        if (span.compareTo(MAX_ALLOWED_WINDOW_SIZE) > 0) {
            errors.put(
                "to",
                List.of("Requested window is too large. Maximum allowed span is %d days."
                    .formatted(MAX_ALLOWED_WINDOW_SIZE.toDays()))
            );
        }

        if (!errors.isEmpty()) {
            throw new AdminDashboardValidationException("Invalid dashboard time window", errors);
        }

        return new DashboardWindow(fromInclusive, toExclusive);
    }

    private List<AdminDashboardSeriesPointDto> buildDeliveryVolumeSeries(DashboardWindow window) {
        List<DeliveryDateCountView> groupedRows = deliveryRepository.countByStatusesGroupedByCreatedDateInWindow(
            ACTIVE_DELIVERY_STATUSES,
            window.fromInclusive(),
            window.toExclusive()
        );

        Map<LocalDate, Long> countByDate = new HashMap<>();
        for (DeliveryDateCountView row : groupedRows) {
            LocalDate bucketDate = row.getBucketDate();
            if (bucketDate == null) {
                continue;
            }
            countByDate.put(bucketDate, Math.max(0, row.getMetricValue()));
        }

        LocalDate fromDate = window.fromInclusive().atOffset(ZoneOffset.UTC).toLocalDate();
        LocalDate toExclusiveDate = window.toExclusive().atOffset(ZoneOffset.UTC).toLocalDate();

        List<AdminDashboardSeriesPointDto> series = new ArrayList<>();
        for (LocalDate cursor = fromDate; cursor.isBefore(toExclusiveDate); cursor = cursor.plusDays(1)) {
            series.add(AdminDashboardSeriesPointDto.builder()
                .label(cursor.toString())
                .value(countByDate.getOrDefault(cursor, 0L))
                .build());
        }
        return series;
    }

    private List<AdminDashboardSeriesPointDto> buildStatusDistributionSeries(DashboardWindow window) {
        List<DeliveryStatusCountView> groupedRows = deliveryRepository.countGroupedByStatusInCreatedWindow(
            window.fromInclusive(),
            window.toExclusive()
        );

        List<AdminDashboardSeriesPointDto> series = new ArrayList<>();
        for (DeliveryStatusCountView row : groupedRows) {
            if (row.getStatus() == null) {
                continue;
            }
            series.add(AdminDashboardSeriesPointDto.builder()
                .label(row.getStatus().name())
                .value(Math.max(0, row.getMetricValue()))
                .build());
        }
        return series;
    }

    private Instant parseFromBoundary(String raw, String fieldName) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseIsoTemporal(raw, fieldName, false);
    }

    private Instant parseToBoundary(String raw, String fieldName) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseIsoTemporal(raw, fieldName, true);
    }

    private Instant parseIsoTemporal(String raw, String fieldName, boolean endOfDayExclusiveForDateOnly) {
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException ignored) {
            // try less strict ISO temporal parsers next
        }
        try {
            return OffsetDateTime.parse(raw).toInstant();
        } catch (DateTimeParseException ignored) {
            // try date-only parser as final fallback
        }
        try {
            LocalDate date = LocalDate.parse(raw);
            if (endOfDayExclusiveForDateOnly) {
                return date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            }
            return date.atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ex) {
            Map<String, List<String>> errors = Map.of(
                fieldName,
                List.of("Expected ISO-8601 timestamp or date (example: 2026-05-01T00:00:00Z or 2026-05-01)")
            );
            throw new AdminDashboardValidationException("Invalid dashboard time window", errors);
        }
    }

    private record DashboardWindow(Instant fromInclusive, Instant toExclusive) {
    }
}
