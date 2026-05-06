-- Drop deliveries columns that are not set by the current UI create flow.
-- Simplified payload keeps only line1/contact fields for addresses and weight/description for package.

ALTER TABLE deliveries
    DROP COLUMN IF EXISTS pickup_line2,
    DROP COLUMN IF EXISTS pickup_city,
    DROP COLUMN IF EXISTS pickup_region,
    DROP COLUMN IF EXISTS pickup_postal_code,
    DROP COLUMN IF EXISTS pickup_country,
    DROP COLUMN IF EXISTS destination_line2,
    DROP COLUMN IF EXISTS destination_city,
    DROP COLUMN IF EXISTS destination_region,
    DROP COLUMN IF EXISTS destination_postal_code,
    DROP COLUMN IF EXISTS destination_country,
    DROP COLUMN IF EXISTS package_length_cm,
    DROP COLUMN IF EXISTS package_width_cm,
    DROP COLUMN IF EXISTS package_height_cm,
    DROP COLUMN IF EXISTS package_fragile;
