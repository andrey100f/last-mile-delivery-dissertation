# Admin Dashboard API (Task `#51`)

Base path: `/api`

Endpoint: `GET /admin/dashboard` (ADMIN role only).

## Query parameters

- `from` (optional) - ISO-8601 timestamp or date.
- `to` (optional) - ISO-8601 timestamp or date.

Time parsing rules:

- API normalizes all date-time values to UTC.
- `from` is inclusive.
- `to` is exclusive.
- date-only inputs are expanded in UTC:
  - `from=2026-05-01` -> `2026-05-01T00:00:00Z`
  - `to=2026-05-07` -> `2026-05-08T00:00:00Z` (exclusive end-of-day boundary)
- default window when missing params: last 7 days ending at request time.
- max allowed window span: 31 days.

Invalid windows return `400` with `ProblemDetail` and `errors`.

## Response contract

Fields:

- `activeDeliveriesCount`
- `couriersOnlineCount`
- `revenueTotal`
- `revenueCurrency`
- `exceptionBacklogCount`
- `generatedAt` (UTC instant)
- `window` (`from`, `to`, `timezone`)
- `deliveryVolumeSeries` (daily buckets in selected window; label = `YYYY-MM-DD`, value = count)
- `statusDistributionSeries` (delivery status grouped counts in selected window)

All numeric metrics are zero-safe (never `null`).

Example response:

```json
{
  "activeDeliveriesCount": 5,
  "couriersOnlineCount": 3,
  "revenueTotal": 842.5,
  "revenueCurrency": "RON",
  "exceptionBacklogCount": 1,
  "generatedAt": "2026-05-14T14:00:00Z",
  "window": {
    "from": "2026-05-07T14:00:00Z",
    "to": "2026-05-14T14:00:00Z",
    "timezone": "UTC"
  },
  "deliveryVolumeSeries": [
    { "label": "2026-05-08", "value": 1 },
    { "label": "2026-05-09", "value": 2 },
    { "label": "2026-05-10", "value": 0 }
  ],
  "statusDistributionSeries": [
    { "label": "CREATED", "value": 3 },
    { "label": "ASSIGNED", "value": 2 },
    { "label": "IN_TRANSIT", "value": 1 }
  ]
}
```

## KPI semantics

- `activeDeliveriesCount`: deliveries in `ASSIGNED`, `PICKED_UP`, `IN_TRANSIT` created in the selected window.
- `couriersOnlineCount`: proxy metric = distinct couriers attached to active deliveries in the same window.
- `revenueTotal`: sum of `totalAmount` for `DELIVERED` deliveries in the window.
- `revenueCurrency`: most frequent currency among delivered rows in window; falls back to `RON` when no rows match.
- `exceptionBacklogCount`: unread notifications in `EXCEPTION` category created in the window.

## Performance note

Heaviest query is `revenueTotal` (`SUM(total_amount)` filtered by status + created_at over `deliveries`).
For this task, dedicated indexes were added:

- `idx_deliveries_status_created_at`
- `idx_deliveries_status_created_at_courier`
- `idx_notifications_category_read_created_at`

These keep the dashboard aggregates index-friendly for common demo windows.
