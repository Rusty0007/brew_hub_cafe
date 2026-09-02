BEGIN;
INSERT INTO brewhub.roles (code, name, description)
VALUES (
        'ADMIN',
        'Administrator',
        'System administrator responsible for staff accounts, roles, access control, and administrative configuration.'
    ) ON CONFLICT (code) DO
UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;
COMMIT;