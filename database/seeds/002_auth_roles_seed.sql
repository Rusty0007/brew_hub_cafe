BEGIN;
INSERT INTO brewhub.roles (code, name, description)
VALUES (
        'CASHIER',
        'Cashier',
        'Cafe staff responsible for day-to-day sales and ordering operations.'
    ),
    (
        'MANAGER',
        'Manager',
        'Cafe management staff with access to management and sensitive operational functions.'
    ) ON CONFLICT (code) DO
UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;
COMMIT;