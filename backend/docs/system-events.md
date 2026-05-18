# Admin system events feed

## Endpoint

- `GET /api/admin/events`
- Authorization: `ADMIN` role only.

## Query parameters

- `type` (optional, repeatable): one or more of
  - `DELIVERY_ASSIGNED`
  - `DELIVERY_STATUS_CHANGED`
  - `EXCEPTION_CREATED`
  - `EXCEPTION_RESOLVED`
  - `LOGIN_FAILED`
- `from` (optional): ISO-8601 timestamp or `yyyy-MM-dd`.
- `to` (optional): ISO-8601 timestamp or `yyyy-MM-dd`.
- pagination: standard Spring `page` and `size`.

Ordering is deterministic (`createdAt DESC`, `id DESC`) and page size is capped by global API pageable limits.

## Emitted event coverage (current MVP)

- `DELIVERY_ASSIGNED`: emitted after successful courier accept commit.
- `DELIVERY_STATUS_CHANGED`: emitted after successful status update commit.
- `LOGIN_FAILED`: emitted for rejected authentication attempts.

`EXCEPTION_CREATED` and `EXCEPTION_RESOLVED` are reserved in the taxonomy and schema for exception workflow integration.

## PII minimization policy

- Event metadata is intentionally restricted to operational context only.
- Login failures store `emailDomain` only (no raw email, no password/token payloads).
- Delivery events include workflow context (`source`, statuses) and delivery target ID.

## Retention and archival

- Retention/archival automation is out of scope for this task.
- Follow-up recommendation: add periodic archival/purge policy once event volume thresholds are measured in production-like workloads.
