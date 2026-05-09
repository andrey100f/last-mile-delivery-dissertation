-- Seed deliveries for courier "Available Requests" and EXPRESS acceptance manual testing.
-- Inserts only if tracking_code is missing, so local resets remain stable.

WITH customer_user AS (
    SELECT id
    FROM users
    WHERE email = 'customer@deliveryhub.local'
),
seed_rows AS (
    SELECT *
    FROM (VALUES
        (
            '6a9e8e96-8c97-4f0d-9cf2-0ceec2b5fb01'::uuid,
            'DH-SEED-AV01',
            'STANDARD',
            'Bd. Eroilor 10, Cluj-Napoca',
            'Alice Customer',
            '+40740111222',
            'Str. Memorandumului 18, Cluj-Napoca',
            'Bob Receiver',
            '+40740111333',
            2.50::numeric,
            18.00::numeric,
            3.25::numeric,
            2.13::numeric,
            23.38::numeric,
            now() - interval '45 minutes'
        ),
        (
            '7f2913e4-0ac5-4fd5-aa5f-6e9a63ce8bb2'::uuid,
            'DH-SEED-AV02',
            'STANDARD',
            'Str. Dorobantilor 45, Cluj-Napoca',
            'Carol Sender',
            '+40740111444',
            'Calea Turzii 102, Cluj-Napoca',
            'Dan Client',
            '+40740111555',
            1.40::numeric,
            14.00::numeric,
            2.80::numeric,
            1.68::numeric,
            18.48::numeric,
            now() - interval '30 minutes'
        ),
        (
            'ec1632f4-8094-4eca-a474-1f51500f54cc'::uuid,
            'DH-SEED-EX01',
            'EXPRESS',
            'Str. Fabricii 77, Cluj-Napoca',
            'Express Sender',
            '+40740111666',
            'Str. Bucuresti 21, Cluj-Napoca',
            'Express Receiver',
            '+40740111777',
            0.90::numeric,
            26.00::numeric,
            5.50::numeric,
            3.15::numeric,
            34.65::numeric,
            now() - interval '20 minutes'
        ),
        (
            '83c0ebd5-64a7-4c3d-af4f-71613ab91e1f'::uuid,
            'DH-SEED-EX02',
            'EXPRESS',
            'Piata Unirii 3, Cluj-Napoca',
            'Priority Sender',
            '+40740111888',
            'Str. Buna Ziua 12, Cluj-Napoca',
            'Priority Receiver',
            '+40740111999',
            3.10::numeric,
            28.00::numeric,
            6.10::numeric,
            3.41::numeric,
            37.51::numeric,
            now() - interval '10 minutes'
        )
    ) AS t(
        id,
        tracking_code,
        delivery_type,
        pickup_line1,
        pickup_contact_name,
        pickup_contact_phone,
        destination_line1,
        destination_contact_name,
        destination_contact_phone,
        package_weight_kg,
        base_amount,
        fee_amount,
        tax_amount,
        total_amount,
        created_at
    )
),
inserted_deliveries AS (
    INSERT INTO deliveries (
        id,
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
        updated_at
    )
    SELECT
        s.id,
        s.tracking_code,
        c.id,
        NULL,
        'CREATED'::delivery_status,
        s.delivery_type,
        s.pickup_line1,
        s.pickup_contact_name,
        s.pickup_contact_phone,
        s.destination_line1,
        s.destination_contact_name,
        s.destination_contact_phone,
        s.package_weight_kg,
        CASE
            WHEN s.delivery_type = 'EXPRESS'
                THEN 'EXPRESS seeded request for acceptance testing'
            ELSE 'STANDARD seeded request for acceptance testing'
            END,
        s.base_amount,
        s.fee_amount,
        s.tax_amount,
        s.total_amount,
        'RON',
        'Seeded by V9 migration for courier available requests tests',
        s.created_at,
        s.created_at
    FROM seed_rows s
             CROSS JOIN customer_user c
    WHERE NOT EXISTS (
        SELECT 1
        FROM deliveries d
        WHERE d.tracking_code = s.tracking_code
    )
    RETURNING id, customer_id, created_at
)
INSERT INTO delivery_status_history (
    id,
    delivery_id,
    status,
    recorded_at,
    note,
    actor_user_id
)
SELECT
    gen_random_uuid(),
    d.id,
    'CREATED'::delivery_status,
    d.created_at,
    'Seeded available request',
    d.customer_id
FROM inserted_deliveries d;
