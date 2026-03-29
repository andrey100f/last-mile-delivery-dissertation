-- V2__seed_dev_users.sql
-- Dev-only test users (task #25). README: password = "password" for all.

DELETE FROM users WHERE email IN (
                                  'customer@deliveryhub.local',
                                  'courier@deliveryhub.local',
                                  'admin@deliveryhub.local'
    );

INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES
    ('a0000001-0000-4000-8000-000000000001'::uuid,
     'customer@deliveryhub.local',
     '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
     'CUSTOMER',
     now(),
     now()),
    ('a0000002-0000-4000-8000-000000000002'::uuid,
     'courier@deliveryhub.local',
     '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
     'COURIER',
     now(),
     now()),
    ('a0000003-0000-4000-8000-000000000003'::uuid,
     'admin@deliveryhub.local',
     '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
     'ADMIN',
     now(),
     now());