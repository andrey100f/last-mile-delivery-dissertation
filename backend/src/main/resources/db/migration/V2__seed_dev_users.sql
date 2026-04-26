-- V2__seed_dev_users.sql
-- Dev-only test users (task #25). README: password = "password" for all.

DELETE FROM users WHERE email IN (
                                  'customer@deliveryhub.local',
                                  'courier@deliveryhub.local',
                                  'admin@deliveryhub.local'
    );

INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES
    ('7035f654-226e-45c2-930a-c9c3cfdc1be7',
     'customer@deliveryhub.local',
     '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
     'CUSTOMER',
     now(),
     now()),
    ('003efa09-9229-4910-99cf-cec6067305b6',
     'courier@deliveryhub.local',
     '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
     'COURIER',
     now(),
     now()),
    ('6fa506dc-70bf-40bb-8e9f-975df704f527',
     'admin@deliveryhub.local',
     '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
     'ADMIN',
     now(),
     now());