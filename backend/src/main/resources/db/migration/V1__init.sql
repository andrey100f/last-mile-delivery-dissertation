-- Auth epic (#25): User entity maps here. UUID default uses built-in gen_random_uuid() (no extension; avoids extra privileges on managed Postgres).

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);
