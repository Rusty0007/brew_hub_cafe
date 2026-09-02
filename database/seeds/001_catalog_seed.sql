BEGIN;
-- =========================================================
-- BrewHub Cafe
-- Development Seed: Catalog Categories + Products
-- =========================================================
-- ---------------------------------------------------------
-- Categories
-- Existing categories are preserved.
-- The database has a case-insensitive unique index on name.
-- ---------------------------------------------------------
INSERT INTO brewhub.categories (name, description, is_active)
VALUES (
        'Coffee',
        'Espresso-based and brewed coffee beverages.',
        true
    ),
    (
        'Tea',
        'Tea, matcha, and tea-based beverages.',
        true
    ),
    (
        'Non-Coffee',
        'Cafe drinks without coffee.',
        true
    ),
    (
        'Pastries',
        'Fresh pastries and baked cafe items.',
        true
    ),
    (
        'Cold Drinks',
        'Cold and refreshing cafe beverages.',
        true
    ) ON CONFLICT DO NOTHING;
-- ---------------------------------------------------------
-- Products
--
-- SKU is unique, so the seed can safely be executed again.
-- Existing seeded products are updated to the values below.
-- ---------------------------------------------------------
INSERT INTO brewhub.products (
        category_id,
        sku,
        name,
        description,
        base_price,
        track_inventory,
        is_active
    )
VALUES -- Coffee
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Coffee')
            LIMIT 1
        ), 'COF-AMER-001', 'Americano', 'Espresso combined with hot water for a smooth, bold cup.', 100.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Coffee')
            LIMIT 1
        ), 'COF-LATT-001', 'Cafe Latte', 'Espresso with steamed milk and a light layer of foam.', 120.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Coffee')
            LIMIT 1
        ), 'COF-CAPP-001', 'Cappuccino', 'Espresso balanced with steamed milk and rich foam.', 115.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Coffee')
            LIMIT 1
        ), 'COF-MOCH-001', 'Cafe Mocha', 'Espresso, chocolate, and steamed milk.', 130.00, true,
        true
    ),
    -- Tea
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Tea')
            LIMIT 1
        ), 'TEA-MATC-001', 'Matcha Latte', 'Smooth matcha blended with creamy milk.', 130.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Tea')
            LIMIT 1
        ), 'TEA-MILK-001', 'Classic Milk Tea', 'Black tea blended with milk for a smooth cafe-style drink.', 110.00, true,
        true
    ),
    -- Non-Coffee
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Non-Coffee')
            LIMIT 1
        ), 'NON-CHOCO-001', 'Hot Chocolate', 'Rich chocolate blended with warm milk.', 110.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Non-Coffee')
            LIMIT 1
        ), 'NON-STRW-001', 'Strawberry Cream', 'Creamy strawberry beverage served cafe-style.', 125.00, true,
        true
    ),
    -- Pastries
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Pastries')
            LIMIT 1
        ), 'PAS-CROI-001', 'Butter Croissant', 'Flaky butter croissant baked until golden.', 85.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Pastries')
            LIMIT 1
        ), 'PAS-MUFF-001', 'Chocolate Muffin', 'Soft chocolate muffin with a rich cocoa flavor.', 75.00, true,
        true
    ),
    -- Cold Drinks
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Cold Drinks')
            LIMIT 1
        ), 'CLD-ILAT-001', 'Iced Latte', 'Espresso and cold milk served over ice.', 130.00, true,
        true
    ),
    (
        (
            SELECT id
            FROM brewhub.categories
            WHERE lower(name) = lower('Cold Drinks')
            LIMIT 1
        ), 'CLD-CBRW-001', 'Cold Brew', 'Slow-steeped cold coffee with a smooth finish.', 125.00, true,
        true
    ) ON CONFLICT (sku) DO
UPDATE
SET category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    track_inventory = EXCLUDED.track_inventory,
    is_active = EXCLUDED.is_active;
COMMIT;