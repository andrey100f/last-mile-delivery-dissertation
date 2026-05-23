-- DEMO DATASET RESET (Last Mile Delivery Hub)
--
-- WARN: Truncates all application tables, then inserts a cohesive snapshot for demos.
-- Targets admin dashboard (deliveries filtered by created_at) plus admin reports
-- (delivery_status_history.recorded_at and DELIVERED revenue joins).
--
-- Logins reuse the bcrypt from V2; password literal is: password
--
TRUNCATE TABLE courier_availability_slots,
    delivery_status_history,
    notifications,
    processed_messages,
    deliveries,
    courier_profiles,
    system_events,
    users RESTART IDENTITY CASCADE;

INSERT INTO users (id, email, password_hash, role, created_at, updated_at, display_name, phone_number)
VALUES ('7035f654-226e-45c2-930a-c9c3cfdc1be7',
        'customer@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'CUSTOMER',
        timezone('utc', now()) - interval '400 days',
        timezone('utc', now()),
        'Alex Customer',
        '+40722111001'),
       ('003efa09-9229-4910-99cf-cec6067305b6',
        'courier@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'COURIER',
        timezone('utc', now()) - interval '395 days',
        timezone('utc', now()),
        'Ion Courier',
        '+40733111002'),
       ('6fa506dc-70bf-40bb-8e9f-975df704f527',
        'admin@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'ADMIN',
        timezone('utc', now()) - interval '500 days',
        timezone('utc', now()),
        'Admin User',
        NULL),
       ('b2c3d4e5-f6a7-4898-bbcd-eeeeeeeeeeee',
        'courier2@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'COURIER',
        timezone('utc', now()) - interval '380 days',
        timezone('utc', now()),
        'Maria Fast',
        '+40744111003'),
       ('c3d4e5f6-a7b8-4998-cdef-aaaaaaaaaaaa',
        'demo-customer-1@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'CUSTOMER',
        timezone('utc', now()) - interval '320 days',
        timezone('utc', now()),
        'Beta Foods SRL',
        '+40755111004'),
       ('d4e5f6a7-b8c9-4a98-def0-bbbbbbbbbbbb',
        'demo-customer-2@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'CUSTOMER',
        timezone('utc', now()) - interval '280 days',
        timezone('utc', now()),
        'Urban Retail SA',
        '+40766111005'),
       ('e5f6a7b8-c9d0-4b89-ef01-cccccccccccc',
        'demo-customer-3@deliveryhub.local',
        '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG',
        'CUSTOMER',
        timezone('utc', now()) - interval '260 days',
        timezone('utc', now()),
        'ClinicNova',
        '+40777111006');

INSERT INTO courier_profiles (id, user_id, display_name, phone, vehicle_type, vehicle_plate,
                              vehicle_capacity_kg, vehicle_capacity_liters,
                              available_now, max_distance_km, express_capable,
                              created_at, updated_at, version)
VALUES ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        '003efa09-9229-4910-99cf-cec6067305b6',
        'Ion Courier',
        '+40733111002',
        'CAR',
        'CJ-99-DHV',
        450.00,
        850.00,
        TRUE,
        45.00,
        TRUE,
        timezone('utc', now()) - interval '394 days',
        timezone('utc', now()),
        0),
       ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        'b2c3d4e5-f6a7-4898-bbcd-eeeeeeeeeeee',
        'Maria Fast',
        '+40744111003',
        'SCOOTER',
        'CJ-01-XEV',
        35.00,
        120.00,
        TRUE,
        18.00,
        TRUE,
        timezone('utc', now()) - interval '379 days',
        timezone('utc', now()),
        0);

INSERT INTO courier_availability_slots (id, courier_profile_id, day_of_week, start_time, end_time)
SELECT gen_random_uuid(),
       cp.id,
       dow.day_text,
       time '07:30',
       time '20:00'
FROM courier_profiles cp
         CROSS JOIN (VALUES ('MONDAY'),
                          ('TUESDAY'),
                          ('WEDNESDAY'),
                          ('THURSDAY'),
                          ('FRIDAY'),
                          ('SATURDAY')) AS dow(day_text);

WITH cust_ids AS MATERIALIZED (
    SELECT array_agg(id ORDER BY email) ids
    FROM users
    WHERE role = 'CUSTOMER'
),
     t0 AS MATERIALIZED (
         SELECT timezone('utc', now()) AS utc_now
     )
INSERT
INTO deliveries (id,
                 tracking_code,
                 customer_id,
                 courier_id,
                 status,
                 delivery_type,
                 pickup_line1,
                 pickup_contact_name,
                 pickup_contact_phone,
                 destination_line1,
                 destination_contact_name,
                 destination_contact_phone,
                 package_weight_kg,
                 package_description,
                 base_amount,
                 fee_amount,
                 tax_amount,
                 total_amount,
                 currency,
                 special_instructions,
                 created_at,
                 updated_at,
                 version)
SELECT gen_random_uuid(),
       format('DH-DEMO-O-%s', lpad(gs::text, 3, '0')),
       (SELECT ids[1 + mod(gs - 1, cardinality(ids))] FROM cust_ids),
       NULL::uuid,
       'CREATED'::delivery_status,
       CASE WHEN mod(gs, 2) = 1 THEN 'STANDARD' ELSE 'EXPRESS' END,
       CASE mod(gs, 5)
           WHEN 0 THEN 'Bd. Tudor Vladimirescu 14, București'
           WHEN 1 THEN 'Str. Memorandumului 28, Cluj-Napoca'
           WHEN 2 THEN 'Calea Floreasca 45, București'
           WHEN 3 THEN 'Bd. Primaverii 6, Iași'
           ELSE 'Bd. Dimitrie Pompeiu 10, București' END,
       'Pickup contact O' || gs,
       '+40722' || lpad((410 + gs)::text, 6, '0'),
       CASE mod(gs, 5)
           WHEN 0 THEN 'Str. Dimitrie Pompeiu 112, București'
           WHEN 1 THEN 'Bd. Mihai Viteazu 77, Turda'
           WHEN 2 THEN 'Bd. Primaverii 4, Sibiu'
           WHEN 3 THEN 'Rond Copou 44, Iași'
           ELSE 'Calea Aradului 118, Timișoara' END,
       'Recipient O' || gs,
       '+40733' || lpad((510 + gs)::text, 6, '0'),
       round((2 + mod(gs * 41, 60) / 8.0000)::numeric, 4),
       'Open marketplace request #' || gs,
       round((16 + mod(gs, 12) + mod(gs * 73, 20) / 10.0000)::numeric, 4),
       round((4.5 + mod(gs, 5) + mod(gs * 3, 12) / 10.0000)::numeric, 4),
       round(((16 + mod(gs, 12) + mod(gs * 73, 20) / 10.0000) * 0.19 +
              (mod(gs * 91, 7) / 10.0000))::numeric, 4),
       round((16 + mod(gs, 12) + mod(gs * 73, 20) / 10.0000)::numeric +
             (4.5 + mod(gs, 5) + mod(gs * 3, 12) / 10.0000)::numeric +
             round(((16 + mod(gs, 12) + mod(gs * 73, 20) / 10.0000) * 0.19 +
                    (mod(gs * 91, 7) / 10.0000))::numeric, 4), 4),
       'RON',
       NULL::varchar,
       (SELECT utc_now FROM t0) - make_interval(hours => 2 + gs, mins => 10 * gs),
       (SELECT utc_now FROM t0) - make_interval(hours => 1 + gs, mins => gs),
       0
FROM generate_series(1, 14) gs;

WITH cust_ids AS MATERIALIZED (
    SELECT array_agg(id ORDER BY email) ids
    FROM users
    WHERE role = 'CUSTOMER'
),
     t0 AS MATERIALIZED (
         SELECT timezone('utc', now()) utc_now
     ),
     courier_ion AS (
         SELECT id::uuid AS cid
         FROM users
         WHERE email = 'courier@deliveryhub.local'
     ),
     courier_maria AS (
         SELECT id::uuid AS cid
         FROM users
         WHERE email = 'courier2@deliveryhub.local'
     )
INSERT
INTO deliveries (id,
                 tracking_code,
                 customer_id,
                 courier_id,
                 status,
                 delivery_type,
                 pickup_line1,
                 pickup_contact_name,
                 pickup_contact_phone,
                 destination_line1,
                 destination_contact_name,
                 destination_contact_phone,
                 package_weight_kg,
                 package_description,
                 base_amount,
                 fee_amount,
                 tax_amount,
                 total_amount,
                 currency,
                 special_instructions,
                 created_at,
                 updated_at,
                 version)
SELECT gen_random_uuid(),
       CASE status_label
           WHEN 'CANCELLED' THEN format('DH-DEMO-Y-%s', lpad(gs::text, 3, '0'))
           WHEN 'FAILED' THEN format('DH-DEMO-X-%s', lpad(gs::text, 3, '0'))
           WHEN 'ASSIGNED_I' THEN format('DH-DEMO-ION-A-%s', lpad(gs::text, 3, '0'))
           WHEN 'PICKED_I' THEN format('DH-DEMO-ION-K-%s', lpad(gs::text, 3, '0'))
           WHEN 'TRANSIT_I' THEN format('DH-DEMO-ION-V-%s', lpad(gs::text, 3, '0'))
           WHEN 'ASSIGNED_M' THEN format('DH-DEMO-MAR-A-%s', lpad(gs::text, 3, '0'))
           WHEN 'PICKED_M' THEN format('DH-DEMO-MAR-K-%s', lpad(gs::text, 3, '0'))
           WHEN 'TRANSIT_M' THEN format('DH-DEMO-MAR-V-%s', lpad(gs::text, 3, '0'))
           END::varchar(64),
       (SELECT ids[1 + mod(gs + 3, cardinality(ids))] FROM cust_ids),
       CASE
           WHEN status_label IN ('ASSIGNED_I', 'PICKED_I', 'TRANSIT_I', 'CANCELLED', 'FAILED') THEN (SELECT cid FROM courier_ion)
           ELSE (SELECT cid FROM courier_maria)
           END,
       CASE status_label
           WHEN 'CANCELLED' THEN 'CANCELLED'::delivery_status
           WHEN 'FAILED' THEN 'FAILED'::delivery_status
           WHEN 'ASSIGNED_I' THEN 'ASSIGNED'::delivery_status
           WHEN 'ASSIGNED_M' THEN 'ASSIGNED'::delivery_status
           WHEN 'PICKED_I' THEN 'PICKED_UP'::delivery_status
           WHEN 'PICKED_M' THEN 'PICKED_UP'::delivery_status
           WHEN 'TRANSIT_I' THEN 'IN_TRANSIT'::delivery_status
           WHEN 'TRANSIT_M' THEN 'IN_TRANSIT'::delivery_status
           END::delivery_status,
       CASE WHEN mod(gs, 2) = 1 THEN 'STANDARD' ELSE 'EXPRESS' END,
       CASE
           WHEN gs % 2 = 1 THEN 'Str. Memorandumului 28, Cluj-Napoca'
           ELSE 'Bd. Primaverii 6, Iași' END::varchar,
       'Pipeline sender #' || gs,
       '+40740' || lpad((720 + gs * 31)::text, 6, '0'),
       CASE
           WHEN gs % 2 = 1 THEN 'Bd. Dimitrie Pompeiu 10, București'
           ELSE 'Calea Dumbrăvii 55, Sibiu' END::varchar,
       'Pipeline receiver #' || gs,
       '+40750' || lpad((620 + gs * 41)::text, 6, '0'),
       round((3 + mod(gs * 91, 18) / 5.0000)::numeric, 4),
       'Active pipeline demo #' || gs,
       round((19 + mod(gs + 111, 16) / 3.1000)::numeric, 4),
       round((5.5 + mod(gs * 83, 7))::numeric, 4),
       round(round((19 + mod(gs + 111, 16) / 3.1000)::numeric, 4) * 0.19::numeric +
             mod(gs + 401, 5) / 10.0000, 4),
       round(round((19 + mod(gs + 111, 16) / 3.1000)::numeric, 4) +
             round((5.5 + mod(gs * 83, 7))::numeric, 4) +
             round(round((19 + mod(gs + 111, 16) / 3.1000)::numeric, 4) * 0.19 +
                   mod(gs + 401, 5) / 10.0000, 4), 4),
       'RON',
       CASE status_label WHEN 'FAILED' THEN 'Simulated POD failure demo' ELSE 'Pipeline demo shipment' END,
       (SELECT utc_now FROM t0) -
       make_interval(days => CASE status_label WHEN 'PICKED_I' THEN 4 WHEN 'TRANSIT_I' THEN 2 WHEN 'PICKED_M' THEN 3 WHEN 'TRANSIT_M' THEN 1 ELSE 6 END -
                              mod(gs, 3),
               hours => CASE status_label WHEN 'TRANSIT_I' THEN 21 WHEN 'TRANSIT_M' THEN 10 ELSE 17 END,
               mins => gs * 7),
       (SELECT utc_now FROM t0) -
       make_interval(days => CASE status_label WHEN 'PICKED_I' THEN 4 WHEN 'TRANSIT_I' THEN 2 WHEN 'PICKED_M' THEN 3 WHEN 'TRANSIT_M' THEN 1 ELSE 6 END -
                              mod(gs, 3),
               hours => CASE status_label WHEN 'TRANSIT_I' THEN 20 WHEN 'TRANSIT_M' THEN 9 ELSE 16 END,
               mins => gs * 3),
       0
FROM generate_series(1, 42) gs
         CROSS JOIN LATERAL (SELECT CASE
                                        WHEN gs <= 2 THEN 'CANCELLED'::text
                                        WHEN gs <= 4 THEN 'FAILED'
                                        WHEN gs <= 10 THEN 'ASSIGNED_I'
                                        WHEN gs <= 15 THEN 'PICKED_I'
                                        WHEN gs <= 19 THEN 'TRANSIT_I'
                                        WHEN gs <= 24 THEN 'ASSIGNED_M'
                                        WHEN gs <= 30 THEN 'PICKED_M'
                                        ELSE 'TRANSIT_M'
                                        END AS status_label) sl;

WITH cust_ids AS MATERIALIZED (
    SELECT array_agg(id ORDER BY email) ids
    FROM users
    WHERE role = 'CUSTOMER'
),
     t0 AS MATERIALIZED (
         SELECT timezone('utc', now()) utc_now
     ),
     courier_ion AS MATERIALIZED (
         SELECT id FROM users WHERE email = 'courier@deliveryhub.local' LIMIT 1
     ),
     courier_maria AS MATERIALIZED (
         SELECT id FROM users WHERE email = 'courier2@deliveryhub.local' LIMIT 1
     )
INSERT
INTO deliveries (id,
                 tracking_code,
                 customer_id,
                 courier_id,
                 status,
                 delivery_type,
                 pickup_line1,
                 pickup_contact_name,
                 pickup_contact_phone,
                 destination_line1,
                 destination_contact_name,
                 destination_contact_phone,
                 package_weight_kg,
                 package_description,
                 base_amount,
                 fee_amount,
                 tax_amount,
                 total_amount,
                 currency,
                 special_instructions,
                 created_at,
                 updated_at,
                 version)
SELECT gen_random_uuid(),
       format('DH-DEMO-D-%s', lpad(gs::text, 3, '0')),
       (SELECT ids[1 + mod(gs * 71, cardinality(ids))] FROM cust_ids),
       CASE WHEN gs % 2 = 1 THEN (SELECT id FROM courier_ion) ELSE (SELECT id FROM courier_maria) END,
       'DELIVERED'::delivery_status,
       CASE WHEN mod(gs + 91, 2) = 1 THEN 'STANDARD' ELSE 'EXPRESS' END,
       CASE mod(gs, 4)
           WHEN 0 THEN 'Bd. Tudor Vladimirescu 14, București'
           WHEN 1 THEN 'Str. Fabricii de Chibrituri 9, București'
           WHEN 2 THEN 'Bd. Primaverii 6, Iași'
           ELSE 'Str. Memorandumului 28, Cluj-Napoca' END,
       'Sender D' || gs,
       '+40780' || lpad((910 + gs * 127)::text, 6, '0'),
       CASE mod(gs, 4)
           WHEN 0 THEN 'Bd. Primaverii 4, Sibiu'
           WHEN 1 THEN 'Calea Dumbrăvii 11, Sibiu'
           WHEN 2 THEN 'Rond Copou 44, Iași'
           ELSE 'Str. Dimitrie Pompeiu 17, București' END,
       'Receiver D' || gs,
       '+40790' || lpad((800 + gs * 91)::text, 6, '0'),
       round((5 + mod(gs + 811, 25) / 5.6000)::numeric, 4),
       'Delivered cohort demo #' || gs,
       round((22 + mod(gs * 331, 18) / 2.8500)::numeric, 4),
       round((6.8 + mod(gs * 419, 8))::numeric, 4),
       round(round((22 + mod(gs * 331, 18) / 2.8500)::numeric, 4) * 0.19::numeric +
             mod(gs * 41, 6) / 10.0000, 4),
       round(round((22 + mod(gs * 331, 18) / 2.8500)::numeric, 4) +
             round((6.8 + mod(gs * 419, 8))::numeric, 4) +
             round(round((22 + mod(gs * 331, 18) / 2.8500)::numeric, 4) * 0.19 +
                   mod(gs * 41, 6) / 10.0000, 4), 4),
       'RON',
       NULL::varchar,
       ((SELECT utc_now FROM t0) -
        make_interval(days => ((gs * 17) % 28) + 1, mins => gs + 331)) -
       interval '50 hours',
       (SELECT utc_now FROM t0) - make_interval(days => ((gs * 17) % 28) + 1, mins => gs + 331),
       0
FROM generate_series(1, 55) gs;

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       'CREATED'::delivery_status,
       d.created_at,
       'Demo seed CREATED open request',
       d.customer_id
FROM deliveries d
WHERE d.tracking_code LIKE 'DH-DEMO-O-%';

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       v.st::delivery_status,
       d.created_at + v.off::interval,
       'demo cancel chain',
       CASE WHEN v.st = 'CREATED' THEN d.customer_id ELSE d.courier_id END
FROM deliveries d
         CROSS JOIN (VALUES ('CREATED', interval '0 minutes'),
                             ('ASSIGNED', interval '32 minutes')) v(st, off)
WHERE d.tracking_code LIKE 'DH-DEMO-Y-%'
UNION ALL
SELECT gen_random_uuid(),
       d.id,
       'CANCELLED'::delivery_status,
       d.created_at + interval '95 minutes',
       'demo cancel terminal',
       '6fa506dc-70bf-40bb-8e9f-975df704f527'::uuid
FROM deliveries d
WHERE d.tracking_code LIKE 'DH-DEMO-Y-%';

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       v.st::delivery_status,
       d.created_at + v.off::interval,
       'demo fail chain',
       CASE WHEN v.st = 'CREATED' THEN d.customer_id ELSE d.courier_id END
FROM deliveries d
         CROSS JOIN (VALUES ('CREATED', interval '0 minutes'),
                             ('ASSIGNED', interval '31 minutes')) v(st, off)
WHERE d.tracking_code LIKE 'DH-DEMO-X-%'
UNION ALL
SELECT gen_random_uuid(),
       d.id,
       'FAILED'::delivery_status,
       d.updated_at,
       'demo fail terminal',
       d.courier_id
FROM deliveries d
WHERE d.tracking_code LIKE 'DH-DEMO-X-%';

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       v.st::delivery_status,
       d.created_at + v.off::interval,
       'demo pipeline ACTIVE',
       CASE WHEN v.st = 'CREATED' THEN d.customer_id ELSE d.courier_id END
FROM deliveries d
         CROSS JOIN (VALUES ('CREATED', interval '0 minutes'),
                             ('ASSIGNED', interval '25 minutes')) v(st, off)
WHERE d.tracking_code LIKE 'DH-DEMO-ION-A-%'
   OR d.tracking_code LIKE 'DH-DEMO-MAR-A-%';

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       v.st::delivery_status,
       d.created_at + v.off::interval,
       'demo pipeline ACTIVE',
       CASE WHEN v.st = 'CREATED' THEN d.customer_id ELSE d.courier_id END
FROM deliveries d
         CROSS JOIN (VALUES ('CREATED', interval '0 minutes'),
                             ('ASSIGNED', interval '24 minutes'),
                             ('PICKED_UP', interval '61 minutes')) v(st, off)
WHERE d.tracking_code LIKE 'DH-DEMO-ION-K-%'
   OR d.tracking_code LIKE 'DH-DEMO-MAR-K-%';

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       v.st::delivery_status,
       d.created_at + v.off::interval,
       'demo pipeline ACTIVE',
       CASE WHEN v.st = 'CREATED' THEN d.customer_id ELSE d.courier_id END
FROM deliveries d
         CROSS JOIN (VALUES ('CREATED', interval '0 minutes'),
                             ('ASSIGNED', interval '22 minutes'),
                             ('PICKED_UP', interval '55 minutes'),
                             ('IN_TRANSIT', interval '86 minutes')) v(st, off)
WHERE d.tracking_code LIKE 'DH-DEMO-ION-V-%'
   OR d.tracking_code LIKE 'DH-DEMO-MAR-V-%';

INSERT INTO delivery_status_history (id, delivery_id, status, recorded_at, note, actor_user_id)
SELECT gen_random_uuid(),
       d.id,
       s.phase::delivery_status,
       ts,
       'demo delivered milestone',
       CASE
           WHEN s.phase = 'CREATED' THEN d.customer_id
           ELSE COALESCE(d.courier_id, d.customer_id)
           END
FROM deliveries d
         CROSS JOIN LATERAL (SELECT d.created_at AS t0,
                                    d.updated_at AS tfinish) t
         CROSS JOIN LATERAL (VALUES ('CREATED', t.t0),
                                    ('ASSIGNED', t.t0 + interval '21 minutes'),
                                    ('PICKED_UP', t.t0 + interval '48 minutes'),
                                    ('IN_TRANSIT', t.t0 + interval '73 minutes'),
                                    ('DELIVERED', t.tfinish)) AS s(phase, ts)
WHERE d.tracking_code LIKE 'DH-DEMO-D-%';

INSERT INTO notifications (id, user_id, delivery_id, type, category, title, message, payload_json,
                           created_at, read_at,
                           dedupe_key)
VALUES (gen_random_uuid(),
        '7035f654-226e-45c2-930a-c9c3cfdc1be7',
        (SELECT id FROM deliveries WHERE tracking_code = 'DH-DEMO-D-003' LIMIT 1),
        'EXCEPTION_REPORTED',
        'EXCEPTION',
        'Access exception needs review',
        'Receiver reported access issue near drop-off DH-DEMO-D-003. Please verify instructions.',
        jsonb_build_object('demoSeeded', true),
        timezone('utc', now()) - interval '61 hours',
        NULL,
        'demo-exc-001'),

       (gen_random_uuid(),
        'c3d4e5f6-a7b8-4998-cdef-aaaaaaaaaaaa',
        (SELECT id FROM deliveries WHERE tracking_code = 'DH-DEMO-D-011' LIMIT 1),
        'EXCEPTION_REPORTED',
        'EXCEPTION',
        'Cold chain escalation',
        'Temperature variance logged for pharma-style parcel DH-DEMO-D-011.',
        jsonb_build_object('demoSeeded', true),
        timezone('utc', now()) - interval '40 hours',
        NULL,
        'demo-exc-002'),

       (gen_random_uuid(),
        'd4e5f6a7-b8c9-4a98-def0-bbbbbbbbbbbb',
        NULL,
        'EXCEPTION_REPORTED',
        'EXCEPTION',
        'Fleet capacity warning',
        'Demo seeded capacity warning for Ops review (no tied delivery row).',
        jsonb_build_object('demoSeeded', true),
        timezone('utc', now()) - interval '22 hours',
        NULL,
        'demo-exc-003'),

       (gen_random_uuid(),
        '7035f654-226e-45c2-930a-c9c3cfdc1be7',
        (SELECT id FROM deliveries WHERE tracking_code = 'DH-DEMO-D-029' LIMIT 1),
        'STATUS_UPDATED',
        'DELIVERY',
        'Status update',
        'Parcel DH-DEMO-D-029 moved toward destination.',
        NULL,
        timezone('utc', now()) - interval '6 hours',
        timezone('utc', now()) - interval '5 hours 50 minutes',
        NULL),

       (gen_random_uuid(),
        'e5f6a7b8-c9d0-4b89-ef01-cccccccccccc',
        (SELECT id FROM deliveries WHERE tracking_code = 'DH-DEMO-D-035' LIMIT 1),
        'DELIVERY_CREATED',
        'DELIVERY',
        'New delivery queued',
        'Demo customer ClinicNova spawned DH-DEMO-D-035 for dispatch testing.',
        NULL,
        timezone('utc', now()) - interval '19 hours',
        NULL,
        'demo-info-ccc-035');

INSERT INTO system_events (id, type, actor_type, actor_id, target_type, target_id, metadata, created_at)
SELECT gen_random_uuid(),
       ev.kind::varchar(64),
       CASE WHEN gs % 2 = 1 THEN 'USER'::varchar(32) ELSE 'SYSTEM'::varchar(32) END,
       CASE WHEN gs % 2 = 1 THEN '003efa09-9229-4910-99cf-cec6067305b6'::uuid ELSE NULL END,
       CASE WHEN ev.kind = 'LOGIN_FAILED' THEN 'AUTH'::varchar(32) WHEN gs % 3 = 2 THEN 'EXCEPTION'::varchar(32) ELSE 'DELIVERY'::varchar(32) END,
       CASE WHEN ev.kind = 'LOGIN_FAILED' THEN NULL ELSE dv.id END,
       jsonb_strip_nulls(jsonb_build_object(
               'demoSeedRow', gs,
               'tracking', dv.tracking_code
                                         )),
       timezone('utc', now()) -
       make_interval(days => mod(gs + 503, 19) + 1, mins => (gs + 719) % 930)
FROM generate_series(1, 52) gs
         CROSS JOIN (SELECT COUNT(*)::int cnt FROM deliveries) dc
         CROSS JOIN LATERAL (
    SELECT CASE mod(gs + 941, 5)
               WHEN 0 THEN 'DELIVERY_ASSIGNED'::text
               WHEN 1 THEN 'DELIVERY_STATUS_CHANGED'
               WHEN 2 THEN 'EXCEPTION_CREATED'
               WHEN 3 THEN 'EXCEPTION_RESOLVED'
               ELSE 'LOGIN_FAILED'
               END AS kind
    ) AS ev
         LEFT JOIN LATERAL (
    SELECT deliveries.id AS id,
           deliveries.tracking_code
    FROM deliveries
    OFFSET CASE WHEN dc.cnt < 2 THEN 0 ELSE mod(gs + 811, dc.cnt) END
        LIMIT 1
    ) dv ON dc.cnt > 0 AND ev.kind <> 'LOGIN_FAILED';
