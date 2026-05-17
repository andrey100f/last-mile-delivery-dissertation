package com.ubb.deliveryhub.admin.reports.application;

import com.ubb.deliveryhub.admin.reports.api.dto.AdminDeliveriesByStatusReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminExceptionsReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.AdminRevenueReportDto;
import com.ubb.deliveryhub.admin.reports.api.dto.ReportBucketStatusDto;
import com.ubb.deliveryhub.admin.reports.api.dto.ReportExceptionBucketDto;
import com.ubb.deliveryhub.admin.reports.api.dto.ReportRevenueBucketDto;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

@Component
public class AdminReportsCsvExporter {

    public String toDeliveriesByStatusCsv(AdminDeliveriesByStatusReportDto report) {
        List<String> headers = new ArrayList<>();
        headers.add("bucketStartUtc");
        headers.add("bucketEndUtc");
        headers.add("total");
        headers.addAll(report.getStatuses());

        List<String> lines = new ArrayList<>();
        lines.add(join(headers));
        for (ReportBucketStatusDto bucket : report.getBuckets()) {
            List<String> columns = new ArrayList<>();
            columns.add(formatInstant(bucket.getBucketStart()));
            columns.add(formatInstant(bucket.getBucketEnd()));
            columns.add(Long.toString(bucket.getTotal()));
            for (String status : report.getStatuses()) {
                long value = bucket.getCountsByStatus().getOrDefault(status, 0L);
                columns.add(Long.toString(value));
            }
            lines.add(join(columns));
        }
        return String.join("\n", lines);
    }

    public String toRevenueCsv(AdminRevenueReportDto report) {
        List<String> lines = new ArrayList<>();
        lines.add("bucketStartUtc,bucketEndUtc,deliveredCount,revenue,currency");
        for (ReportRevenueBucketDto bucket : report.getBuckets()) {
            lines.add(join(List.of(
                formatInstant(bucket.getBucketStart()),
                formatInstant(bucket.getBucketEnd()),
                Long.toString(bucket.getDeliveredCount()),
                formatDecimal(bucket.getRevenue()),
                report.getCurrency()
            )));
        }
        return String.join("\n", lines);
    }

    public String toExceptionsCsv(AdminExceptionsReportDto report) {
        List<String> headers = new ArrayList<>();
        headers.add("bucketStartUtc");
        headers.add("bucketEndUtc");
        headers.add("total");
        headers.addAll(report.getExceptionTypes());

        List<String> lines = new ArrayList<>();
        lines.add(join(headers));
        for (ReportExceptionBucketDto bucket : report.getBuckets()) {
            List<String> columns = new ArrayList<>();
            columns.add(formatInstant(bucket.getBucketStart()));
            columns.add(formatInstant(bucket.getBucketEnd()));
            columns.add(Long.toString(bucket.getTotal()));
            for (String type : report.getExceptionTypes()) {
                long value = bucket.getCountsByType().getOrDefault(type, 0L);
                columns.add(Long.toString(value));
            }
            lines.add(join(columns));
        }
        return String.join("\n", lines);
    }

    private String join(List<String> values) {
        StringJoiner joiner = new StringJoiner(",");
        for (String value : values) {
            joiner.add(escapeCsv(value));
        }
        return joiner.toString();
    }

    private String formatInstant(Instant value) {
        return value != null ? value.toString() : "";
    }

    private String formatDecimal(BigDecimal value) {
        return value != null ? value.toPlainString() : "0";
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
