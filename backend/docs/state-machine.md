# Delivery status state machine

This document is the single source of truth for allowed status transitions used by backend endpoint `PATCH /api/deliveries/{id}/status`.

## Transition matrix

| Current status | Allowed next statuses |
| --- | --- |
| `CREATED` | `ASSIGNED` |
| `ASSIGNED` | `PICKED_UP` |
| `PICKED_UP` | `IN_TRANSIT` |
| `IN_TRANSIT` | `DELIVERED` |
| `DELIVERED` | _(none, terminal)_ |
| `CANCELLED` | _(none, terminal)_ |
| `FAILED` | _(none, terminal)_ |

## Endpoint request forms

Exactly one field is required:

- explicit target:

```json
{
  "targetStatus": "IN_TRANSIT"
}
```

- action mapped to status:

```json
{
  "action": "PICKED_UP"
}
```

Supported actions: `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`.

## Authorization and error semantics

- Caller must have role `COURIER` and must be the assigned courier for that delivery.
- Illegal transitions return `400` with code `INVALID_STATUS_TRANSITION`.
- Ownership violations return `403` via global access-denied handling.
- Missing delivery returns `404`.

## Consistency guarantees

- Status update and history append are persisted inside one transaction.
- A `DeliveryStatusChangedEvent` is published after commit for downstream integrations (tracking/notifications).
