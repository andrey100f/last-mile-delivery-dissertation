-- Task #68: idempotency store for async RabbitMQ consumers.

CREATE TABLE IF NOT EXISTS processed_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_name VARCHAR(128) NOT NULL,
    event_id UUID NOT NULL,
    delivery_id UUID,
    outcome VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_messages_consumer_event_unique
    ON processed_messages (consumer_name, event_id);

CREATE INDEX IF NOT EXISTS idx_processed_messages_delivery_id
    ON processed_messages (delivery_id);

COMMENT ON TABLE processed_messages IS 'Idempotency markers for asynchronous message consumers.';
COMMENT ON COLUMN processed_messages.outcome IS 'Final outcome for the processed event (ASSIGNED/NOOP...).';
