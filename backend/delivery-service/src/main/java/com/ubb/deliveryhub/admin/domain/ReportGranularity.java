package com.ubb.deliveryhub.admin.reports.domain;

import com.ubb.deliveryhub.admin.reports.domain.exception.AdminReportsValidationException;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public enum ReportGranularity {
    DAY("day", Duration.ofDays(1)),
    WEEK("week", Duration.ofDays(7));

    private final String sqlToken;
    private final Duration bucketStep;

    ReportGranularity(String sqlToken, Duration bucketStep) {
        this.sqlToken = sqlToken;
        this.bucketStep = bucketStep;
    }

    public String sqlToken() {
        return sqlToken;
    }

    public Duration bucketStep() {
        return bucketStep;
    }

    public Instant alignToBucketStart(Instant instant) {
        LocalDate date = instant.atOffset(ZoneOffset.UTC).toLocalDate();
        if (this == WEEK) {
            date = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }
        return date.atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    public static ReportGranularity fromRaw(String raw) {
        if (raw == null || raw.isBlank()) {
            return DAY;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return ReportGranularity.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new AdminReportsValidationException(
                "Invalid reports query",
                Map.of("granularity", List.of("Allowed values: day, week"))
            );
        }
    }
}
