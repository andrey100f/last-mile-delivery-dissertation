-- Single Postgres enum for delivery status (deliveries + history); replaces duplicated VARCHAR CHECK lists from V3.
-- Safe after V3: cast existing values to the new enum type.

CREATE TYPE delivery_status AS ENUM (
    'CREATED',
    'ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'FAILED'
);

ALTER TABLE deliveries
    DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE delivery_status_history
    DROP CONSTRAINT IF EXISTS delivery_status_history_status_check;

ALTER TABLE deliveries
    ALTER COLUMN status TYPE delivery_status
        USING (status::delivery_status);

ALTER TABLE delivery_status_history
    ALTER COLUMN status TYPE delivery_status
        USING (status::delivery_status);
