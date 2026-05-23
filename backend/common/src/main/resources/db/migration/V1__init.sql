-- Auth epic (#25): User entity maps here. UUID default uses built-in gen_random_uuid() (no extension; avoids extra privileges on managed Postgres).

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(60) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('CUSTOMER', 'COURIER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
