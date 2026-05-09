# WebSocket tracking (GH-43)

This document defines the backend contract for real-time delivery tracking over STOMP.

## Endpoint and destination contract

- STOMP endpoint: `/api/ws-tracking`
- Application prefix: `/app`
- Broker prefix: `/topic`
- Tracking topic format: `/topic/deliveries/{deliveryId}/tracking`

The topic contract is immutable once frontend integration starts.

## Authentication and authorization

WebSocket handshake is open, but STOMP frames are secured:

- `CONNECT` requires JWT from one of:
  - native header `Authorization: Bearer <token>`,
  - native header `token`,
  - query string `?token=<jwt>` (fallback).
- `SUBSCRIBE` is allowed only for destination pattern `/topic/deliveries/{deliveryId}/tracking`.
- For valid topic subscriptions, backend verifies delivery access using the same ownership rules as `GET /api/deliveries/{id}`:
  - owner customer,
  - assigned courier (or available request policy for `CREATED`),
  - admin.

Rejected `CONNECT` and `SUBSCRIBE` attempts fail with deterministic errors:

- `WS_CONNECT_UNAUTHORIZED`
- `WS_SUBSCRIBE_DENIED`

## Threat model notes

- **Token replay**: mitigated by JWT expiry and signature validation at each `CONNECT`.
- **Leaked token in query string**: supported only as fallback; prefer STOMP native `Authorization` header in clients.
- **Delivery ID enumeration**: mitigated by strict subscription pattern + per-delivery ownership check.

## Event payload contract

Events are published to `/topic/deliveries/{deliveryId}/tracking` after successful status transition commit:

```json
{
  "eventVersion": 1,
  "deliveryId": "uuid",
  "status": "IN_TRANSIT",
  "updatedAt": "2026-01-10T12:34:56Z",
  "etaMinutes": null,
  "progressPercent": 75
}
```

`eventVersion` is required for forward-compatible schema evolution.

## Operational defaults

- Heartbeat defaults: server send/receive `10000ms / 10000ms`.
- Client reconnect strategy:
  - exponential backoff (`1s`, `2s`, `4s`, ... up to `30s`),
  - re-subscribe after reconnect,
  - fallback to polling (`GET /api/deliveries/{id}/status`) while socket is down.
- Reverse proxy/Nginx:
  - enable HTTP upgrade headers for `/api/ws-tracking`,
  - use sticky sessions if running multiple API nodes with in-memory broker.
- In-memory simple broker limitations:
  - single-node scope,
  - no durable subscriptions,
  - no cross-node fan-out without external broker.

## Logging policy

- `INFO`: connect/disconnect with `sessionId` and principal id only.
- Never log JWT tokens or personal delivery data.
- `DEBUG`: payload publish traces are allowed in non-production.

## Manual verification script

1. Open Session A as customer and subscribe to `/topic/deliveries/{ownedDeliveryId}/tracking`.
2. Open Session B as assigned courier and call `PATCH /api/deliveries/{id}/status`.
3. Confirm Session A receives a tracking event without page refresh.
4. Try subscribing with an unrelated user token to the same delivery topic.
5. Confirm subscription is denied with `WS_SUBSCRIBE_DENIED`.
