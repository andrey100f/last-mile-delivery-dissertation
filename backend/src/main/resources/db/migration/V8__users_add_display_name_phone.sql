ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(64);

UPDATE users
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL OR btrim(display_name) = '';
