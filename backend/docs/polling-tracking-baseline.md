# Polling tracking baseline (GH-44)

This document defines the REST polling baseline used to compare against WebSocket tracking (GH-43) in UC1.

## Endpoint contract

- Method/path: `GET /api/deliveries/{id}/status`
- Auth: JWT Bearer, same visibility policy as `GET /api/deliveries/{id}`
- Response payload:
  - `status` (`CREATED|ASSIGNED|PICKED_UP|IN_TRANSIT|DELIVERED|CANCELLED|FAILED`)
  - `etaMinutes` (nullable; currently `null`)
  - `updatedAt` (ISO-8601 UTC timestamp)
  - `progressPercent` (nullable, derived cheaply from status)

The payload is intentionally compact for high-frequency requests.

## Authorization and error semantics

The endpoint reuses delivery ownership policy from #32:

- owned customer / assigned courier / admin -> `200`
- unrelated authenticated user -> `403`
- missing delivery id -> `404`

Unknown ETA is represented as `null` (not as `0`).

## Cache hints for polling

Responses include an `ETag` based on delivery status and `updatedAt`. Clients may send `If-None-Match` to reduce payload transfer:

- no status change -> `304 Not Modified`
- status changed -> `200` with the new snapshot body

## Suggested polling intervals

- Demo and local comparisons: every `2s` to `5s`
- Production-like baseline: start around `10s` and lower only when UX requires it

Use jitter (for example +/- 300ms) on multi-client scenarios to avoid synchronized spikes.

## Curl loop example (baseline experiment)

```bash
TOKEN="<jwt>"
DELIVERY_ID="<delivery-uuid>"

while true; do
  date -u +"%Y-%m-%dT%H:%M:%SZ"
  curl -sS "http://localhost:8080/api/deliveries/${DELIVERY_ID}/status" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json"
  echo
  sleep 3
done
```

For bandwidth-focused runs, persist and resend `ETag` via `If-None-Match` between calls.
