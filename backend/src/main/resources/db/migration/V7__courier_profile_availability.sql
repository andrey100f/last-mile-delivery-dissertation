-- Task #49: courier self-service profile and availability persistence.
-- Normalized model to support future matching/filtering rules.

CREATE TABLE IF NOT EXISTS courier_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    vehicle_type VARCHAR(32),
    vehicle_plate VARCHAR(32),
    vehicle_capacity_kg NUMERIC(10, 2),
    vehicle_capacity_liters NUMERIC(10, 2),
    available_now BOOLEAN NOT NULL DEFAULT FALSE,
    max_distance_km NUMERIC(10, 2),
    express_capable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT courier_profiles_vehicle_type_check CHECK (
        vehicle_type IS NULL OR vehicle_type IN ('BIKE', 'SCOOTER', 'CAR', 'VAN')
    )
);

CREATE INDEX IF NOT EXISTS idx_courier_profiles_user_id
    ON courier_profiles (user_id);

CREATE TABLE IF NOT EXISTS courier_availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_profile_id UUID NOT NULL REFERENCES courier_profiles (id) ON DELETE CASCADE,
    day_of_week VARCHAR(16) NOT NULL CHECK (
        day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
    ),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT courier_availability_slots_time_order_check CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_courier_availability_slots_profile_day
    ON courier_availability_slots (courier_profile_id, day_of_week, start_time);

INSERT INTO courier_profiles (
    user_id,
    display_name,
    phone,
    vehicle_type,
    vehicle_plate,
    vehicle_capacity_kg,
    vehicle_capacity_liters,
    available_now,
    max_distance_km,
    express_capable,
    created_at,
    updated_at
)
SELECT
    u.id,
    'Courier Demo',
    NULL,
    'BIKE',
    NULL,
    15,
    40,
    FALSE,
    10,
    FALSE,
    now(),
    now()
FROM users u
WHERE u.email = 'courier@deliveryhub.local'
  AND NOT EXISTS (
      SELECT 1 FROM courier_profiles cp WHERE cp.user_id = u.id
  );
