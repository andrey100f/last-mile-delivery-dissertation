-- Task #51: indexes supporting admin dashboard aggregate queries.

CREATE INDEX IF NOT EXISTS idx_deliveries_status_created_at
    ON deliveries (status, created_at);

CREATE INDEX IF NOT EXISTS idx_deliveries_status_created_at_courier
    ON deliveries (status, created_at, courier_id);

CREATE INDEX IF NOT EXISTS idx_notifications_category_read_created_at
    ON notifications (category, read_at, created_at);
