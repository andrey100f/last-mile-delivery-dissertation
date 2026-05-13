-- Task #46: in-app notifications persistence for customer feed (list/read/read-all).
-- Immutable message content + mutable read_at metadata.

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES deliveries (id) ON DELETE SET NULL,
    type VARCHAR(64) NOT NULL
        CHECK (type IN (
                          'DELIVERY_ASSIGNED',
                          'STATUS_UPDATED',
                          'EXCEPTION_REPORTED',
                          'DELIVERY_CREATED',
                          'DELIVERY_CANCELLED',
                          'SYSTEM_ANNOUNCEMENT'
            )),
    category VARCHAR(32) NOT NULL
        CHECK (category IN ('DELIVERY', 'EXCEPTION', 'SYSTEM', 'ADMIN')),
    title VARCHAR(255) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at_desc
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
    ON notifications (user_id, read_at);

COMMENT ON TABLE notifications IS 'Task #46 notification feed backing table.';
COMMENT ON COLUMN notifications.payload_json IS 'Optional event metadata for richer UI actions (#47/#48).';
