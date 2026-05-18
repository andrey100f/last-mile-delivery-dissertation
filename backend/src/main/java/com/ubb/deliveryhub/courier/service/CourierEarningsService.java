package com.ubb.deliveryhub.courier.service;

import com.ubb.deliveryhub.courier.CourierEarningsDefaults;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsChartPointDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsEntryDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsQueryDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsSummaryDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsTrendDto;
import com.ubb.deliveryhub.courier.api.dto.earnings.CourierEarningsWindowDto;
import com.ubb.deliveryhub.courier.domain.exception.CourierEarningsValidationException;
import com.ubb.deliveryhub.courier.domain.exception.InvalidCourierEarningsSortException;
import com.ubb.deliveryhub.delivery.domain.DeliveryStatus;
import com.ubb.deliveryhub.delivery.repository.CourierEarningEntryView;
import com.ubb.deliveryhub.delivery.repository.DeliveryStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourierEarningsService {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of("recordedAt", "id");
    private static final int CURRENCY_SCALE = 2;

    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;

    @Transactional(readOnly = true)
    public CourierEarningsSummaryDto getSummary(Authentication authentication, CourierEarningsQueryDto query) {
        UUID courierId = principalUserId(authentication);
        Window customWindow = resolveWindow(query, true);
        String currency = resolveCurrency(courierId, customWindow.fromInclusive(), customWindow.toExclusive());

        Instant now = Instant.now();
        Window todayWindow = dayWindow(now);
        Window weekWindow = weekWindow(now);
        Window monthWindow = monthWindow(now);

        BigDecimal todayTotal = sumWindow(courierId, currency, todayWindow);
        BigDecimal weekTotal = sumWindow(courierId, currency, weekWindow);
        BigDecimal monthTotal = sumWindow(courierId, currency, monthWindow);
        BigDecimal customRangeTotal = sumWindow(courierId, currency, customWindow);

        Duration span = Duration.between(customWindow.fromInclusive(), customWindow.toExclusive());
        Window previousWindow = new Window(
            customWindow.fromInclusive().minus(span),
            customWindow.fromInclusive()
        );
        BigDecimal previousPeriodTotal = sumWindow(courierId, currency, previousWindow);
        BigDecimal deltaAmount = customRangeTotal.subtract(previousPeriodTotal);
        BigDecimal deltaPercent = previousPeriodTotal.signum() > 0
            ? deltaAmount.multiply(BigDecimal.valueOf(100))
                .divide(previousPeriodTotal, 2, RoundingMode.HALF_UP)
            : null;

        List<CourierEarningsChartPointDto> chartPoints = toChartPoints(
            deliveryStatusHistoryRepository.findDeliveredEarningsEntriesInWindow(
                courierId,
                DeliveryStatus.DELIVERED,
                currency,
                customWindow.fromInclusive(),
                customWindow.toExclusive()
            ),
            customWindow
        );

        return CourierEarningsSummaryDto.builder()
            .currency(currency)
            .todayTotal(normalizeAmount(todayTotal))
            .weekTotal(normalizeAmount(weekTotal))
            .monthTotal(normalizeAmount(monthTotal))
            .customRangeTotal(normalizeAmount(customRangeTotal))
            .trend(CourierEarningsTrendDto.builder()
                .previousPeriodTotal(normalizeAmount(previousPeriodTotal))
                .deltaAmount(normalizeAmount(deltaAmount))
                .deltaPercent(deltaPercent)
                .build())
            .window(CourierEarningsWindowDto.builder()
                .from(customWindow.fromInclusive())
                .to(toInclusiveInstant(customWindow.toExclusive()))
                .toExclusive(customWindow.toExclusive())
                .timezone(CourierEarningsDefaults.TIMEZONE)
                .maxRangeDays(CourierEarningsDefaults.MAX_RANGE_DAYS)
                .build())
            .chartPoints(chartPoints)
            .build();
    }

    @Transactional(readOnly = true)
    public Page<CourierEarningsEntryDto> getEntries(
        Authentication authentication,
        CourierEarningsQueryDto query,
        Pageable pageable
    ) {
        if (!pageable.isPaged()) {
            throw new CourierEarningsValidationException(
                "Invalid earnings query",
                Map.of("page", List.of("Pagination is required"))
            );
        }

        assertAllowedSort(pageable.getSort());
        Pageable effectivePage = applyDefaultSort(pageable);
        UUID courierId = principalUserId(authentication);
        Window window = resolveWindow(query, false);
        String currency = resolveCurrency(courierId, window.fromInclusive(), window.toExclusive());
        if (window.fromInclusive() == null || window.toExclusive() == null) {
            return deliveryStatusHistoryRepository.findDeliveredEarningsEntriesForCourier(
                courierId,
                DeliveryStatus.DELIVERED,
                currency,
                effectivePage
            ).map(this::toEntryDto);
        }
        return deliveryStatusHistoryRepository.findDeliveredEarningsEntriesForCourier(
            courierId,
            DeliveryStatus.DELIVERED,
            currency,
            window.fromInclusive(),
            window.toExclusive(),
            effectivePage
        ).map(this::toEntryDto);
    }

    private CourierEarningsEntryDto toEntryDto(CourierEarningEntryView row) {
        return CourierEarningsEntryDto.builder()
            .deliveryId(row.getDeliveryId())
            .trackingCode(row.getTrackingCode())
            .amount(normalizeAmount(row.getTotalAmount()))
            .currency(row.getCurrency())
            .status(row.getStatus())
            .earnedAt(row.getRecordedAt())
            .category("DELIVERY_COMPLETION")
            .note(row.getNote())
            .build();
    }

    private List<CourierEarningsChartPointDto> toChartPoints(List<CourierEarningEntryView> entries, Window window) {
        Map<LocalDate, BigDecimal> totals = new LinkedHashMap<>();
        LocalDate dateCursor = toUtcDate(window.fromInclusive());
        LocalDate toInclusiveDate = toUtcDate(toInclusiveInstant(window.toExclusive()));
        while (!dateCursor.isAfter(toInclusiveDate)) {
            totals.put(dateCursor, BigDecimal.ZERO);
            dateCursor = dateCursor.plusDays(1);
        }

        for (CourierEarningEntryView row : entries) {
            LocalDate day = toUtcDate(row.getRecordedAt());
            if (!totals.containsKey(day)) {
                continue;
            }
            BigDecimal current = totals.get(day);
            BigDecimal amount = row.getTotalAmount() != null ? row.getTotalAmount() : BigDecimal.ZERO;
            totals.put(day, current.add(amount));
        }

        List<CourierEarningsChartPointDto> points = new ArrayList<>();
        for (Map.Entry<LocalDate, BigDecimal> entry : totals.entrySet()) {
            Instant bucketStart = entry.getKey().atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant bucketEnd = entry.getKey().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            points.add(CourierEarningsChartPointDto.builder()
                .bucketStart(bucketStart)
                .bucketEnd(bucketEnd)
                .total(normalizeAmount(entry.getValue()))
                .build());
        }
        return points;
    }

    private String resolveCurrency(UUID courierId, Instant fromInclusive, Instant toExclusive) {
        List<String> currencies;
        if (fromInclusive == null || toExclusive == null) {
            currencies = deliveryStatusHistoryRepository.findDominantDeliveredCurrenciesForCourier(
                courierId,
                DeliveryStatus.DELIVERED
            );
        } else {
            currencies = deliveryStatusHistoryRepository.findDominantDeliveredCurrenciesForCourier(
                courierId,
                DeliveryStatus.DELIVERED,
                fromInclusive,
                toExclusive
            );
        }
        if (currencies.isEmpty()) {
            currencies = deliveryStatusHistoryRepository.findDominantDeliveredCurrenciesForCourier(
                courierId,
                DeliveryStatus.DELIVERED
            );
        }
        if (currencies.isEmpty()) {
            return "RON";
        }
        String value = currencies.getFirst();
        return value == null || value.isBlank() ? "RON" : value;
    }

    private BigDecimal sumWindow(UUID courierId, String currency, Window window) {
        BigDecimal total = deliveryStatusHistoryRepository.sumDeliveredEarningsByCourierAndCurrencyInWindow(
            courierId,
            DeliveryStatus.DELIVERED,
            currency,
            window.fromInclusive(),
            window.toExclusive()
        );
        return normalizeAmount(total);
    }

    private Window resolveWindow(CourierEarningsQueryDto query, boolean allowFallback) {
        String rawFrom = query != null ? query.getFrom() : null;
        String rawTo = query != null ? query.getTo() : null;
        boolean hasFrom = rawFrom != null && !rawFrom.isBlank();
        boolean hasTo = rawTo != null && !rawTo.isBlank();

        if (allowFallback && !hasFrom && !hasTo) {
            Instant now = Instant.now();
            return new Window(
                dayStart(now).minus(Duration.ofDays(13)),
                dayStart(now).plus(Duration.ofDays(1))
            );
        }
        if (!allowFallback && !hasFrom && !hasTo) {
            return new Window(null, null);
        }
        if (hasFrom != hasTo) {
            throw new CourierEarningsValidationException(
                "Invalid earnings query",
                Map.of("to", List.of("'from' and 'to' must be provided together"))
            );
        }

        Instant fromInclusive = parseBoundary(rawFrom, "from", false);
        Instant toExclusive = parseBoundary(rawTo, "to", true);
        if (!fromInclusive.isBefore(toExclusive)) {
            throw new CourierEarningsValidationException(
                "Invalid earnings query",
                Map.of("from", List.of("'from' must be before 'to'"))
            );
        }

        Duration span = Duration.between(fromInclusive, toExclusive);
        if (span.compareTo(Duration.ofDays(CourierEarningsDefaults.MAX_RANGE_DAYS)) > 0) {
            throw new CourierEarningsValidationException(
                "Invalid earnings query",
                Map.of(
                    "to",
                    List.of("Requested window is too large. Maximum allowed span is %d days."
                        .formatted(CourierEarningsDefaults.MAX_RANGE_DAYS))
                )
            );
        }

        return new Window(fromInclusive, toExclusive);
    }

    private static void assertAllowedSort(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        for (Sort.Order order : sort) {
            if (!ALLOWED_SORT_PROPERTIES.contains(order.getProperty())) {
                throw new InvalidCourierEarningsSortException(order.getProperty(), ALLOWED_SORT_PROPERTIES);
            }
        }
    }

    private static Pageable applyDefaultSort(Pageable pageable) {
        if (!pageable.getSort().isUnsorted()) {
            Sort sort = pageable.getSort();
            boolean hasId = sort.getOrderFor("id") != null;
            if (hasId) {
                return pageable;
            }
            Sort enrichedSort = sort.and(Sort.by(Sort.Order.desc("id")));
            return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), enrichedSort);
        }
        return PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(
                Sort.Order.desc(CourierEarningsDefaults.SORT_PROPERTY),
                Sort.Order.desc("id")
            )
        );
    }

    private static UUID principalUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private Window dayWindow(Instant now) {
        Instant from = dayStart(now);
        return new Window(from, from.plus(Duration.ofDays(1)));
    }

    private Window weekWindow(Instant now) {
        LocalDate today = toUtcDate(now);
        LocalDate weekStartDate = today.with(java.time.DayOfWeek.MONDAY);
        Instant from = weekStartDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        return new Window(from, from.plus(Duration.ofDays(7)));
    }

    private Window monthWindow(Instant now) {
        LocalDate today = toUtcDate(now);
        LocalDate monthStartDate = today.with(TemporalAdjusters.firstDayOfMonth());
        Instant from = monthStartDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        LocalDate nextMonthStartDate = monthStartDate.plusMonths(1);
        return new Window(from, nextMonthStartDate.atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    private Instant parseBoundary(String raw, String fieldName, boolean toExclusiveForDateOnly) {
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException ignored) {
            // fallback
        }
        try {
            return OffsetDateTime.parse(raw).toInstant();
        } catch (DateTimeParseException ignored) {
            // fallback
        }
        try {
            LocalDate date = LocalDate.parse(raw);
            if (toExclusiveForDateOnly) {
                return date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            }
            return date.atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ex) {
            throw new CourierEarningsValidationException(
                "Invalid earnings query",
                Map.of(fieldName, List.of(
                    "Expected ISO-8601 timestamp or date (example: 2026-05-01T00:00:00Z or 2026-05-01)"
                ))
            );
        }
    }

    private static BigDecimal normalizeAmount(BigDecimal raw) {
        if (raw == null) {
            return BigDecimal.ZERO.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        }
        return raw.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
    }

    private static Instant dayStart(Instant point) {
        return toUtcDate(point).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private static Instant toInclusiveInstant(Instant toExclusive) {
        if (toExclusive == null) {
            return null;
        }
        return toExclusive.minusNanos(1);
    }

    private static LocalDate toUtcDate(Instant point) {
        return point.atOffset(ZoneOffset.UTC).toLocalDate();
    }

    private record Window(Instant fromInclusive, Instant toExclusive) {
    }
}
