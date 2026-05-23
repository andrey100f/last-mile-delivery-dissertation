-- Task #59: structured system events feed for admin observability.

CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(64) NOT NULL
        CHECK (type IN (
            'DELIVERY_ASSIGNED',
            'DELIVERY_STATUS_CHANGED',
            'EXCEPTION_CREATED',
            'EXCEPTION_RESOLVED',
            'LOGIN_FAILED'
        )),
    actor_type VARCHAR(32) NOT NULL
        CHECK (actor_type IN ('USER', 'ANONYMOUS', 'SYSTEM')),
    actor_id UUID,
    target_type VARCHAR(32) NOT NULL
        CHECK (target_type IN ('DELIVERY', 'EXCEPTION', 'AUTH', 'SYSTEM')),
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_created_at_id_desc
    ON system_events (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_type_created_at_id_desc
    ON system_events (type, created_at DESC, id DESC);

COMMENT ON TABLE system_events IS 'Task #59 admin-facing operational event feed.';
COMMENT ON COLUMN system_events.metadata IS 'PII-minimized event metadata for troubleshooting context.';
