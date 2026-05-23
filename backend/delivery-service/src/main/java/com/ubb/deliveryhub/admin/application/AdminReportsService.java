package com.ubb.deliveryhub.admin.reports.application;

import com.ubb.deliveryhub.admin.reports.api.dto.AdminDeliveriesByStatusReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminReportsQueryDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminRevenueReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.ReportBucketStatusDto;
import com.ubb.deliveryhub.admin.reports.api.dto.ReportRevenueBucketDto;
import com.ubb.deliveryhub.admin.reports.api.dto.ReportWindowDto;
import com.ubb.deliveryhub.admin.reports.domain.ReportGranularity;
import com.ubb.deliveryhub.admin.reports.domain.exception.AdminReportsValidationException;
import com.ubb.deliveryhub.admin.reports.infrastructure.AdminReportsQueryRepository;
import com.ubb.deliveryhub.admin.reports.infrastructure.row.DeliveryStatusAggregateRow;
import com.ubb.deliveryhub.admin.reports.infrastructure.row.RevenueAggregateRow;
import lombok.RequiredArgsConstructor;
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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminReportsService {

    private static final Duration MAX_ALLOWED_WINDOW_SIZE = Duration.ofDays(180);
    private static final String WINDOW_TIMEZONE = "UTC";

    private final AdminReportsQueryRepository reportsQueryRepository;

    @Transactional(readOnly = true)
    public AdminDeliveriesByStatusReportDto getDeliveriesByStatus(AdminReportsQueryDto query) {
        ReportWindow window = resolveWindow(query);
        List<DeliveryStatusAggregateRow> rows = reportsQueryRepository.fetchDeliveriesByStatus(
            window.fromInclusive(),
            window.toExclusive(),
            window.granularity()
        );

        Set<String> statusSet = new LinkedHashSet<>();
        Map<Instant, Map<String, Long>> countsByBucket = new LinkedHashMap<>();
        for (DeliveryStatusAggregateRow row : rows) {
            if (row.status() == null || row.status().isBlank()) {
                continue;
            }
            statusSet.add(row.status());
            countsByBucket
                .computeIfAbsent(row.bucketStart(), _ignored -> new LinkedHashMap<>())
                .merge(row.status(), Math.max(0, row.count()), Long::sum);
        }

        List<String> statuses = statusSet.stream().sorted().toList();
        List<ReportBucketStatusDto> buckets = new ArrayList<>();
        long totalStatusEvents = 0;
        for (Instant bucketStart : listBuckets(window)) {
            Instant bucketEnd = bucketStart.plus(window.granularity().bucketStep());
            if (bucketEnd.isAfter(window.toExclusive())) {
                bucketEnd = window.toExclusive();
            }

            Map<String, Long> source = countsByBucket.getOrDefault(bucketStart, Map.of());
            Map<String, Long> normalized = new LinkedHashMap<>();
            long bucketTotal = 0;
            for (String status : statuses) {
                long value = Math.max(0, source.getOrDefault(status, 0L));
                normalized.put(status, value);
                bucketTotal += value;
            }
            totalStatusEvents += bucketTotal;
            buckets.add(ReportBucketStatusDto.builder()
                .bucketStart(bucketStart)
                .bucketEnd(bucketEnd)
                .countsByStatus(normalized)
                .total(bucketTotal)
                .build());
        }

        return AdminDeliveriesByStatusReportDto.builder()
            .window(toWindowDto(window))
            .totalStatusEvents(totalStatusEvents)
            .statuses(statuses)
            .buckets(buckets)
            .build();
    }

    @Transactional(readOnly = true)
    public AdminRevenueReportDto getRevenueReport(AdminReportsQueryDto query) {
        ReportWindow window = resolveWindow(query);
        List<RevenueAggregateRow> rows = reportsQueryRepository.fetchRevenueByDeliveredPeriod(
            window.fromInclusive(),
            window.toExclusive(),
            window.granularity()
        );

        Map<Instant, RevenueAggregateRow> byBucket = new LinkedHashMap<>();
        for (RevenueAggregateRow row : rows) {
            byBucket.put(row.bucketStart(), row);
        }

        List<ReportRevenueBucketDto> buckets = new ArrayList<>();
        long totalDeliveredCount = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        for (Instant bucketStart : listBuckets(window)) {
            Instant bucketEnd = bucketStart.plus(window.granularity().bucketStep());
            if (bucketEnd.isAfter(window.toExclusive())) {
                bucketEnd = window.toExclusive();
            }

            RevenueAggregateRow row = byBucket.get(bucketStart);
            long deliveredCount = row != null ? Math.max(0, row.deliveredCount()) : 0L;
            BigDecimal revenue = row != null && row.revenue() != null ? row.revenue() : BigDecimal.ZERO;

            totalDeliveredCount += deliveredCount;
            totalRevenue = totalRevenue.add(revenue);

            buckets.add(ReportRevenueBucketDto.builder()
                .bucketStart(bucketStart)
                .bucketEnd(bucketEnd)
                .deliveredCount(deliveredCount)
                .revenue(revenue)
                .build());
        }

        return AdminRevenueReportDto.builder()
            .window(toWindowDto(window))
            .currency(resolveDominantRevenueCurrency(rows))
            .deliveredCount(totalDeliveredCount)
            .totalRevenue(totalRevenue)
            .buckets(buckets)
            .build();
    }

    private String resolveDominantRevenueCurrency(List<RevenueAggregateRow> rows) {
        for (RevenueAggregateRow row : rows) {
            if (row.dominantCurrency() != null && !row.dominantCurrency().isBlank()) {
                return row.dominantCurrency();
            }
        }
        return "RON";
    }

    private List<Instant> listBuckets(ReportWindow window) {
        List<Instant> buckets = new ArrayList<>();
        Instant cursor = window.granularity().alignToBucketStart(window.fromInclusive());
        while (cursor.isBefore(window.toExclusive())) {
            buckets.add(cursor);
            cursor = cursor.plus(window.granularity().bucketStep());
        }
        return buckets;
    }

    private ReportWindowDto toWindowDto(ReportWindow window) {
        return ReportWindowDto.builder()
            .from(window.fromInclusive())
            .to(window.toExclusive())
            .timezone(WINDOW_TIMEZONE)
            .granularity(window.granularity())
            .maxRangeDays(MAX_ALLOWED_WINDOW_SIZE.toDays())
            .build();
    }

    private ReportWindow resolveWindow(AdminReportsQueryDto query) {
        Instant fromInclusive = parseFromBoundary(query != null ? query.getFrom() : null, "from");
        Instant toExclusive = parseToBoundary(query != null ? query.getTo() : null, "to");
        ReportGranularity granularity = ReportGranularity.fromRaw(query != null ? query.getGranularity() : null);

        Map<String, List<String>> errors = new LinkedHashMap<>();
        if (fromInclusive == null) {
            errors.put("from", List.of("'from' is required"));
        }
        if (toExclusive == null) {
            errors.put("to", List.of("'to' is required"));
        }
        if (!errors.isEmpty()) {
            throw new AdminReportsValidationException("Invalid reports query", errors);
        }
        if (!fromInclusive.isBefore(toExclusive)) {
            throw new AdminReportsValidationException(
                "Invalid reports query",
                Map.of("from", List.of("'from' must be before 'to'"))
            );
        }

        Duration span = Duration.between(fromInclusive, toExclusive);
        if (span.compareTo(MAX_ALLOWED_WINDOW_SIZE) > 0) {
            throw new AdminReportsValidationException(
                "Invalid reports query",
                Map.of("to", List.of("Requested window is too large. Maximum allowed span is 180 days."))
            );
        }

        return new ReportWindow(fromInclusive, toExclusive, granularity);
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
            Instant parsed = Instant.parse(raw);
            return endOfDayExclusiveForDateOnly ? parsed.plusNanos(1) : parsed;
        } catch (DateTimeParseException ignored) {
            // fallback parsers below
        }
        try {
            Instant parsed = OffsetDateTime.parse(raw).toInstant();
            return endOfDayExclusiveForDateOnly ? parsed.plusNanos(1) : parsed;
        } catch (DateTimeParseException ignored) {
            // fallback parsers below
        }
        try {
            LocalDate date = LocalDate.parse(raw);
            if (endOfDayExclusiveForDateOnly) {
                return date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            }
            return date.atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ex) {
            throw new AdminReportsValidationException(
                "Invalid reports query",
                Map.of(fieldName, List.of(
                    "Expected ISO-8601 timestamp or date (example: 2026-05-01T00:00:00Z or 2026-05-01)"
                ))
            );
        }
    }

    private record ReportWindow(
        Instant fromInclusive,
        Instant toExclusive,
        ReportGranularity granularity
    ) {
    }
}
