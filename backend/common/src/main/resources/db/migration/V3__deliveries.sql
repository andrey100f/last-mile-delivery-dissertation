-- Task #30: deliveries + delivery_status_history (Phase 2 delivery domain).
-- customer_id / courier_id → users(id); Option A: customer is a users row (typically role CUSTOMER).
-- History rows: ON DELETE CASCADE when delivery is removed; actor_user_id → users without cascade.

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(64) UNIQUE,
    customer_id UUID NOT NULL REFERENCES users (id),
    courier_id UUID REFERENCES users (id),
    status VARCHAR(32) NOT NULL
        CHECK (status IN (
                          'CREATED',
                          'ASSIGNED',
                          'PICKED_UP',
                          'IN_TRANSIT',
                          'DELIVERED',
                          'CANCELLED',
                          'FAILED'
            )),
    delivery_type VARCHAR(32) NOT NULL
        CHECK (delivery_type IN ('STANDARD', 'EXPRESS')),
    pickup_line1 VARCHAR(255) NOT NULL,
    pickup_line2 VARCHAR(255),
    pickup_city VARCHAR(128) NOT NULL,
    pickup_region VARCHAR(128),
    pickup_postal_code VARCHAR(32) NOT NULL,
    pickup_country VARCHAR(2) NOT NULL,
    pickup_contact_name VARCHAR(255) NOT NULL,
    pickup_contact_phone VARCHAR(64) NOT NULL,
    destination_line1 VARCHAR(255) NOT NULL,
    destination_line2 VARCHAR(255),
    destination_city VARCHAR(128) NOT NULL,
    destination_region VARCHAR(128),
    destination_postal_code VARCHAR(32) NOT NULL,
    destination_country VARCHAR(2) NOT NULL,
    destination_contact_name VARCHAR(255) NOT NULL,
    destination_contact_phone VARCHAR(64) NOT NULL,
    package_weight_kg NUMERIC(12, 4) NOT NULL,
    package_length_cm NUMERIC(12, 2),
    package_width_cm NUMERIC(12, 2),
    package_height_cm NUMERIC(12, 2),
    package_description VARCHAR(1000),
    package_fragile BOOLEAN NOT NULL DEFAULT FALSE,
    base_amount NUMERIC(19, 4),
    fee_amount NUMERIC(19, 4),
    tax_amount NUMERIC(19, 4),
    total_amount NUMERIC(19, 4),
    currency VARCHAR(3) NOT NULL DEFAULT 'RON',
    special_instructions VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_deliveries_customer_status ON deliveries (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_courier_status ON deliveries (courier_id, status);

CREATE TABLE IF NOT EXISTS delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries (id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL
        CHECK (status IN (
                          'CREATED',
                          'ASSIGNED',
                          'PICKED_UP',
                          'IN_TRANSIT',
                          'DELIVERED',
                          'CANCELLED',
                          'FAILED'
            )),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note VARCHAR(2000),
    actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery_recorded
    ON delivery_status_history (delivery_id, recorded_at);

COMMENT ON COLUMN deliveries.special_instructions IS 'Max 2000 chars; align Bean Validation @Size in #31.';
COMMENT ON COLUMN deliveries.base_amount IS 'Pricing snapshot; populated in #31.';
COMMENT ON COLUMN delivery_status_history.actor_user_id IS 'Optional audit; no FK cascade beyond SET NULL on user delete.';
