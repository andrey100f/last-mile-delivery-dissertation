-- Align create-delivery payload with simplified frontend address shape.
-- Keep line1/contact_name/contact_phone required, make city/postal/country optional.

ALTER TABLE deliveries
    ALTER COLUMN pickup_city DROP NOT NULL,
    ALTER COLUMN pickup_postal_code DROP NOT NULL,
    ALTER COLUMN pickup_country DROP NOT NULL,
    ALTER COLUMN destination_city DROP NOT NULL,
    ALTER COLUMN destination_postal_code DROP NOT NULL,
    ALTER COLUMN destination_country DROP NOT NULL;
