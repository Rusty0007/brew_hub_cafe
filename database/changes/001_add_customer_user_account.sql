BEGIN;
ALTER TABLE brewhub.customers
ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE brewhub.customers DROP CONSTRAINT IF EXISTS fk_customers_user;
ALTER TABLE brewhub.customers
ADD CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES brewhub.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE brewhub.customers DROP CONSTRAINT IF EXISTS customers_user_id_key;
ALTER TABLE brewhub.customers
ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);
COMMIT;