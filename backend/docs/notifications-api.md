# Notifications API (`#46`)

Base path: `/api`

Endpoints are exposed under `/notifications` only.

## Notification DTO contract

Each list item contains:

- `id`
- `type`
- `category`
- `title`
- `message`
- `deliveryId` (nullable)
- `createdAt`
- `read` (`true` when `readAt` is present)
- `readAt` (nullable)

`payload_json` is persistence-only and not part of the API response contract.

## Types dictionary

Stable values used by emitters (`#47`) and UI icon mapping (`#48`):

- `DELIVERY_ASSIGNED`
- `STATUS_UPDATED`
- `EXCEPTION_REPORTED`
- `DELIVERY_CREATED`
- `DELIVERY_CANCELLED`
- `SYSTEM_ANNOUNCEMENT`

Categories:

- `DELIVERY`
- `EXCEPTION`
- `SYSTEM`
- `ADMIN`

## Event emission contract (`#47`)

The delivery domain emits `NotificationRequested` events with this serializable payload:

- `eventId`
- `eventType` (`ASSIGNMENT_ACCEPTED`, `STATUS_UPDATED`, `EXCEPTION_REPORTED`)
- `deliveryId`
- `actorUserId`
- `targetUserIds`
- `status` (nullable by event type)
- `occurredAt`
- `metadata` (optional map)

Current emission points:

- courier accepts a delivery (`POST /deliveries/{id}/accept`) -> customer notification
- courier updates status (`PATCH /deliveries/{id}/status`) -> customer notifications for milestones (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`)

Processing runs in an `AFTER_COMMIT` listener, so notification failures cannot roll back assignment/status transaction success.

Idempotency keying is persisted as `dedupe_key` (`recipient + delivery + eventType + status`) to avoid duplicate rows on retries/replays.

## Sync vs async mode

Properties:

- `notifications.async.enabled` (default `false`)
- `notifications.async.fallback-to-sync` (default `true`)
- `notifications.async.exchange` (default `deliveryhub.notifications`)
- `notifications.async.routing-key` (default `requested`)

Behavior:

- when async is `false`, listener writes directly to `notifications` table
- when async is `true`, listener publishes to RabbitMQ for downstream consumer ownership (`#69`)
- fallback setting controls whether a failed publish is persisted synchronously

## `GET /notifications`

Returns paginated notifications for the authenticated customer only.

Query parameters:

- `page`, `size`, `sort` (Spring pageable)
- `unreadOnly` (optional boolean)
- `type` (optional enum value from above)

Default sort is `createdAt,desc`.

Example:

```bash
curl -s -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/notifications?unreadOnly=true&type=STATUS_UPDATED&page=0&size=20"
```

## `PATCH /notifications/{id}/read`

Marks one notification as read for the authenticated customer.

- idempotent: already-read rows still return success
- ownership-safe: rows outside the current user scope return `404`

Example:

```bash
curl -i -X PATCH -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/notifications/2e4d9268-f4d6-4f09-9fd6-65e4f48aafaa/read"
```

Expected success status: `204 No Content`.

## `PATCH /notifications/read-all`

Marks all unread notifications as read for the authenticated customer and returns an update count.

Example:

```bash
curl -s -X PATCH -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/notifications/read-all"
```

Example response:

```json
{
  "updatedCount": 3
}
```
