package com.ubb.deliveryhub.admin.reports.infrastructure;

import com.ubb.deliveryhub.admin.reports.domain.ReportGranularity;
import com.ubb.deliveryhub.admin.reports.infrastructure.row.DeliveryStatusAggregateRow;
import com.ubb.deliveryhub.admin.reports.infrastructure.row.ExceptionAggregateRow;
import com.ubb.deliveryhub.admin.reports.infrastructure.row.RevenueAggregateRow;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class AdminReportsQueryRepository {

    private static final String BUCKET_EXPRESSION = """
        (date_trunc(:granularity, timezone('UTC', %s)) AT TIME ZONE 'UTC')
        """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public List<DeliveryStatusAggregateRow> fetchDeliveriesByStatus(
        Instant fromInclusive,
        Instant toExclusive,
        ReportGranularity granularity
    ) {
        String sql = """
            SELECT
              %s AS bucket_start_utc,
              h.status AS status,
              COUNT(*) AS metric_value
            FROM delivery_status_history h
            WHERE h.recorded_at >= :fromInclusive
              AND h.recorded_at < :toExclusive
            GROUP BY 1, h.status
            ORDER BY 1 ASC, h.status ASC
            """.formatted(BUCKET_EXPRESSION.formatted("h.recorded_at"));

        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("fromInclusive", toSqlTimestamp(fromInclusive))
            .addValue("toExclusive", toSqlTimestamp(toExclusive))
            .addValue("granularity", granularity.sqlToken());

        return jdbcTemplate.query(
            sql,
            params,
            (rs, _rowNum) -> new DeliveryStatusAggregateRow(
                readInstant(rs, "bucket_start_utc"),
                rs.getString("status"),
                rs.getLong("metric_value")
            )
        );
    }

    public List<RevenueAggregateRow> fetchRevenueByDeliveredPeriod(
        Instant fromInclusive,
        Instant toExclusive,
        ReportGranularity granularity
    ) {
        String sql = """
            SELECT
              %s AS bucket_start_utc,
              COUNT(*) AS delivered_count,
              COALESCE(SUM(d.total_amount), 0) AS revenue_total
            FROM delivery_status_history h
            JOIN deliveries d ON d.id = h.delivery_id
            WHERE h.status = 'DELIVERED'
              AND h.recorded_at >= :fromInclusive
              AND h.recorded_at < :toExclusive
            GROUP BY 1
            ORDER BY 1 ASC
            """.formatted(BUCKET_EXPRESSION.formatted("h.recorded_at"));

        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("fromInclusive", toSqlTimestamp(fromInclusive))
            .addValue("toExclusive", toSqlTimestamp(toExclusive))
            .addValue("granularity", granularity.sqlToken());

        return jdbcTemplate.query(
            sql,
            params,
            (rs, _rowNum) -> new RevenueAggregateRow(
                readInstant(rs, "bucket_start_utc"),
                rs.getLong("delivered_count"),
                readBigDecimal(rs, "revenue_total")
            )
        );
    }

    public String findRevenueCurrency(
        Instant fromInclusive,
        Instant toExclusive
    ) {
        String sql = """
            SELECT d.currency
            FROM delivery_status_history h
            JOIN deliveries d ON d.id = h.delivery_id
            WHERE h.status = 'DELIVERED'
              AND h.recorded_at >= :fromInclusive
              AND h.recorded_at < :toExclusive
            GROUP BY d.currency
            ORDER BY COUNT(*) DESC, d.currency ASC
            LIMIT 1
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("fromInclusive", toSqlTimestamp(fromInclusive))
            .addValue("toExclusive", toSqlTimestamp(toExclusive));

        List<String> currencies = jdbcTemplate.query(
            sql,
            params,
            (rs, _rowNum) -> rs.getString("currency")
        );
        if (currencies.isEmpty() || currencies.get(0) == null || currencies.get(0).isBlank()) {
            return "RON";
        }
        return currencies.get(0);
    }

    public List<ExceptionAggregateRow> fetchExceptionCountsByType(
        Instant fromInclusive,
        Instant toExclusive,
        ReportGranularity granularity
    ) {
        String sql = """
            SELECT
              %s AS bucket_start_utc,
              n.type AS notification_type,
              COUNT(*) AS metric_value
            FROM notifications n
            WHERE n.category = 'EXCEPTION'
              AND n.created_at >= :fromInclusive
              AND n.created_at < :toExclusive
            GROUP BY 1, n.type
            ORDER BY 1 ASC, n.type ASC
            """.formatted(BUCKET_EXPRESSION.formatted("n.created_at"));

        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("fromInclusive", toSqlTimestamp(fromInclusive))
            .addValue("toExclusive", toSqlTimestamp(toExclusive))
            .addValue("granularity", granularity.sqlToken());

        return jdbcTemplate.query(
            sql,
            params,
            (rs, _rowNum) -> new ExceptionAggregateRow(
                readInstant(rs, "bucket_start_utc"),
                rs.getString("notification_type"),
                rs.getLong("metric_value")
            )
        );
    }

    private Instant readInstant(ResultSet rs, String columnName) throws SQLException {
        Object rawValue = rs.getObject(columnName);
        if (rawValue instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (rawValue instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        Timestamp fallback = rs.getTimestamp(columnName);
        return fallback != null ? fallback.toInstant() : Instant.EPOCH;
    }

    private BigDecimal readBigDecimal(ResultSet rs, String columnName) throws SQLException {
        BigDecimal value = rs.getBigDecimal(columnName);
        return value != null ? value : BigDecimal.ZERO;
    }

    private Timestamp toSqlTimestamp(Instant instant) {
        return Timestamp.from(instant);
    }
}
