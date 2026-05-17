-- Task #57: indexes supporting admin reports aggregate queries.

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_status_recorded_at
    ON delivery_status_history (status, recorded_at);

CREATE INDEX IF NOT EXISTS idx_notifications_category_created_at_type
    ON notifications (category, created_at, type);
