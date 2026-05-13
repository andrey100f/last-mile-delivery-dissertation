-- Task #47: dedupe support for notification event retries/replays.

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
    ON notifications (dedupe_key)
    WHERE dedupe_key IS NOT NULL;

COMMENT ON COLUMN notifications.dedupe_key IS 'Idempotency key derived from recipient+delivery+event type+status.';
