# Notification DLQ Runbook

This runbook covers safe inspection and replay for `NotificationRequested` poison or exhausted messages.

## 1) Inspect DLQ messages safely

1. Pause or scale down the notification consumer if you need a stable snapshot.
2. Open RabbitMQ management UI and inspect queue `notification.consume.dlq`.
3. For each message, record:
   - `eventId` from payload
   - `x-failure-reason`
   - `x-exception-class`
   - `x-attempt-count`
   - `x-correlation-id`
4. Group failures by reason before replaying. Do not replay blindly.

## 2) Decide replay eligibility

Replay only after remediation is confirmed:

- code fix deployed for validation/classification bug, or
- configuration corrected (routing/template/environment), or
- transient dependency issue is resolved.

Never replay while the root cause is still present; messages will cycle back into DLQ.

## 3) Replay process

Recommended approach:

1. Keep idempotency enabled (`dedupe_key = eventId:targetUserId`).
2. Replay in bounded batches (for example 50-200 messages).
3. Republish payload to:
   - exchange: `notification.events`
   - routing key: `notification.requested`
4. Preserve or reattach `x-correlation-id` when possible for traceability.

Manual replay can be done from RabbitMQ UI ("Get messages" + republish) or by an operational script using the same exchange/routing key.

## 4) Safety checklist (mandatory)

- [ ] Root cause fixed before replay
- [ ] Consumer enabled and healthy
- [ ] Replay batch size bounded
- [ ] `notification.async.consume{outcome="duplicate"}` monitored during replay
- [ ] `notification.async.consume{outcome="dlq"}` not increasing unexpectedly
- [ ] Notification rows verified in DB after each batch

## 5) Post-replay verification

1. Confirm DLQ depth decreases as expected.
2. Verify spot-sampled users received one effective notification per `(eventId,targetUserId)`.
3. Check logs by `eventId`/`correlationId` for `outcome=success|duplicate`.
4. Document replay window, batch size, and outcomes in incident notes.
