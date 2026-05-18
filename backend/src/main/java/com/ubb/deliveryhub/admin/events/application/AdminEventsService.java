package com.ubb.deliveryhub.admin.events.application;

import com.ubb.deliveryhub.admin.events.api.dto.AdminEventsQueryDto;
import com.ubb.deliveryhub.admin.events.api.dto.AdminSystemEventDto;
import com.ubb.deliveryhub.admin.events.api.dto.AdminSystemEventsPageDto;
import com.ubb.deliveryhub.admin.events.domain.exception.AdminEventsValidationException;
import com.ubb.deliveryhub.events.domain.SystemEvent;
import com.ubb.deliveryhub.events.domain.SystemEventType;
import com.ubb.deliveryhub.events.infrastructure.SystemEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminEventsService {

    private static final Duration MAX_ALLOWED_WINDOW_SIZE = Duration.ofDays(180);
    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of("createdAt", "id", "type");

    private final SystemEventRepository systemEventRepository;

    @Transactional(readOnly = true)
    public AdminSystemEventsPageDto getEvents(AdminEventsQueryDto query, Pageable pageable) {
        if (!pageable.isPaged()) {
            throw new AdminEventsValidationException(
                "Invalid events query",
                Map.of("page", List.of("Pagination is required"))
            );
        }
        assertAllowedSort(pageable.getSort());
        Pageable effectivePageable = applyDefaultSort(pageable);
        QueryWindow window = resolveWindow(query);
        Set<SystemEventType> types = resolveTypes(query != null ? query.getType() : null);

        Specification<SystemEvent> spec = (root, _query, cb) -> cb.conjunction();
        if (!types.isEmpty()) {
            spec = spec.and((root, _query, cb) -> root.get("type").in(types));
        }
        if (window.fromInclusive() != null) {
            spec = spec.and((root, _query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), window.fromInclusive()));
        }
        if (window.toExclusive() != null) {
            spec = spec.and((root, _query, cb) -> cb.lessThan(root.get("createdAt"), window.toExclusive()));
        }

        Page<SystemEvent> page = systemEventRepository.findAll(spec, effectivePageable);
        List<AdminSystemEventDto> items = page.stream().map(this::toDto).toList();
        return AdminSystemEventsPageDto.builder()
            .items(items)
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    private static void assertAllowedSort(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        for (Sort.Order order : sort) {
            if (!ALLOWED_SORT_PROPERTIES.contains(order.getProperty())) {
                throw new AdminEventsValidationException(
                    "Invalid events query",
                    Map.of("sort", List.of("Unsupported sort property: " + order.getProperty()))
                );
            }
        }
    }

    private static Pageable applyDefaultSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
            );
        }
        Sort sort = pageable.getSort();
        if (sort.getOrderFor("id") != null) {
            return pageable;
        }
        Sort enrichedSort = sort.and(Sort.by(Sort.Order.desc("id")));
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), enrichedSort);
    }

    private QueryWindow resolveWindow(AdminEventsQueryDto query) {
        Instant fromInclusive = parseBoundary(query != null ? query.getFrom() : null, "from", false);
        Instant toExclusive = parseBoundary(query != null ? query.getTo() : null, "to", true);
        Instant now = Instant.now();

        if (fromInclusive == null && toExclusive == null) {
            toExclusive = now;
            fromInclusive = toExclusive.minus(MAX_ALLOWED_WINDOW_SIZE);
        } else if (fromInclusive == null) {
            fromInclusive = toExclusive.minus(MAX_ALLOWED_WINDOW_SIZE);
        } else if (toExclusive == null) {
            toExclusive = fromInclusive.plus(MAX_ALLOWED_WINDOW_SIZE);
        }

        if (!fromInclusive.isBefore(toExclusive)) {
            throw new AdminEventsValidationException(
                "Invalid events query",
                Map.of("from", List.of("'from' must be before 'to'"))
            );
        }
        Duration span = Duration.between(fromInclusive, toExclusive);
        if (span.compareTo(MAX_ALLOWED_WINDOW_SIZE) > 0) {
            throw new AdminEventsValidationException(
                "Invalid events query",
                Map.of("to", List.of("Requested window is too large. Maximum allowed span is 180 days."))
            );
        }

        return new QueryWindow(fromInclusive, toExclusive);
    }

    private Instant parseBoundary(String raw, String fieldName, boolean toExclusiveForDateOnly) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException ignored) {
            // fallback below
        }
        try {
            return OffsetDateTime.parse(raw).toInstant();
        } catch (DateTimeParseException ignored) {
            // fallback below
        }
        try {
            LocalDate date = LocalDate.parse(raw);
            return toExclusiveForDateOnly
                ? date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)
                : date.atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ex) {
            throw new AdminEventsValidationException(
                "Invalid events query",
                Map.of(fieldName, List.of(
                    "Expected ISO-8601 timestamp or date (example: 2026-05-01T00:00:00Z or 2026-05-01)"
                ))
            );
        }
    }

    private Set<SystemEventType> resolveTypes(List<String> rawTypes) {
        if (rawTypes == null || rawTypes.isEmpty()) {
            return Set.of();
        }
        Set<SystemEventType> parsed = new LinkedHashSet<>();
        List<String> invalid = new ArrayList<>();
        for (String rawType : rawTypes) {
            if (rawType == null || rawType.isBlank()) {
                continue;
            }
            SystemEventType.fromRaw(rawType).ifPresentOrElse(parsed::add, () -> invalid.add(rawType));
        }
        if (!invalid.isEmpty()) {
            throw new AdminEventsValidationException(
                "Invalid events query",
                Map.of(
                    "type",
                    List.of(
                        "Unsupported event type(s): " + String.join(", ", invalid),
                        "Allowed values: " + String.join(", ", List.of(
                            SystemEventType.DELIVERY_ASSIGNED.name(),
                            SystemEventType.DELIVERY_STATUS_CHANGED.name(),
                            SystemEventType.EXCEPTION_CREATED.name(),
                            SystemEventType.EXCEPTION_RESOLVED.name(),
                            SystemEventType.LOGIN_FAILED.name()
                        ))
                    )
                )
            );
        }
        return parsed;
    }

    private AdminSystemEventDto toDto(SystemEvent event) {
        return AdminSystemEventDto.builder()
            .id(event.getId())
            .type(event.getType().name())
            .actorType(event.getActorType().name())
            .actorId(event.getActorId())
            .targetType(event.getTargetType().name())
            .targetId(event.getTargetId())
            .metadata(event.getMetadata())
            .createdAt(event.getCreatedAt())
            .build();
    }

    private record QueryWindow(Instant fromInclusive, Instant toExclusive) {
    }
}
