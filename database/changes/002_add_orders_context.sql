BEGIN;
ALTER TABLE brewhub.orders
ADD COLUMN IF NOT EXISTS source varchar(20);
ALTER TABLE brewhub.orders
ADD COLUMN IF NOT EXISTS order_type varchar(20);
-- Existing development orders are treated
-- as POS / TAKEOUT unless already assigned.
UPDATE brewhub.orders
SET source = 'POS'
WHERE source IS NULL;
UPDATE brewhub.orders
SET order_type = 'TAKEOUT'
WHERE order_type IS NULL;
ALTER TABLE brewhub.orders
ALTER COLUMN source
SET NOT NULL;
ALTER TABLE brewhub.orders
ALTER COLUMN source
SET DEFAULT 'POS';
ALTER TABLE brewhub.orders
ALTER COLUMN order_type
SET NOT NULL;
ALTER TABLE brewhub.orders
ALTER COLUMN order_type
SET DEFAULT 'TAKEOUT';
ALTER TABLE brewhub.orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE brewhub.orders
ADD CONSTRAINT orders_source_check CHECK (
        source IN ('CUSTOMER', 'POS')
    );
ALTER TABLE brewhub.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE brewhub.orders
ADD CONSTRAINT orders_order_type_check CHECK (
        order_type IN ('DINE_IN', 'TAKEOUT')
    );
ALTER TABLE brewhub.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE brewhub.orders
ADD CONSTRAINT orders_status_check CHECK (
        status IN (
            'DRAFT',
            'PENDING_PAYMENT',
            'PAID',
            'COMPLETED',
            'CANCELLED'
        )
    );
COMMIT;