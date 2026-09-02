# BrewHub Cafe — Database Notes

## 1. Required Tables

The assessment explicitly requires an ERD containing:

- users
- customers
- categories
- products
- orders
- order_items
- payments
- inventory
- stock_movements

## 2. Required Relationships

The assessment expects discovery of:

- Customer 1:M Orders
- Orders 1:M Order Items
- Products 1:M Order Items

Therefore:

- Orders and Products have a many-to-many business relationship through `order_items`.

## 3. Suggested Relationship Outline

```text
customers
    |
    | 1:M
    v
orders
    |
    | 1:M
    v
order_items
    ^
    | M:1
    |
products
    ^
    | M:1
    |
categories

orders
    |
    | 1:M or business-defined
    v
payments

products
    |
    | inventory relationship
    v
inventory

products
    |
    | 1:M
    v
stock_movements
```

The exact optionality and payment cardinality must be decided in the final ERD.

## 4. JOIN Decisions Required by the Assessment

### Customers who purchased

```sql
SELECT DISTINCT c.*
FROM customers c
INNER JOIN orders o
    ON o.customer_id = c.id;
```

**Reason:** Only customers with matching orders should appear.

### All customers, including customers with no purchase

```sql
SELECT c.*, o.id AS order_id
FROM customers c
LEFT JOIN orders o
    ON o.customer_id = c.id;
```

**Reason:** All customers must remain in the result even when no order exists.

### Customers who never purchased

```sql
SELECT c.*
FROM customers c
LEFT JOIN orders o
    ON o.customer_id = c.id
WHERE o.id IS NULL;
```

**Reason:** This is an anti-join.

### Every product, even if never sold

```sql
SELECT p.*, oi.id AS order_item_id
FROM products p
LEFT JOIN order_items oi
    ON oi.product_id = p.id;
```

**Reason:** Products without sales must still be returned.

### Only products sold yesterday

A typical direction is:

```sql
SELECT DISTINCT p.*
FROM products p
INNER JOIN order_items oi
    ON oi.product_id = p.id
INNER JOIN orders o
    ON o.id = oi.order_id
WHERE o.created_at >= :start_of_yesterday
  AND o.created_at < :start_of_today;
```

**Reason:** Only products with matching sold order items during the requested period should appear.

### Every product with current inventory, including products with no inventory row

```sql
SELECT p.*, i.quantity
FROM products p
LEFT JOIN inventory i
    ON i.product_id = p.id;
```

**Reason:** Products must appear even when no inventory row exists.

## 5. Dangerous Cross-Domain Reporting JOIN

The assessment gives this example:

```sql
SELECT o.id, p.name, i.quantity, pay.status
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
JOIN inventory i ON i.product_id = p.id
JOIN payments pay ON pay.order_id = o.id;
```

Ownership boundaries crossed:

- Ordering -> Catalog
- Catalog/Ordering -> Inventory
- Ordering -> Payment

Risk:

- report code depends on several physical schemas;
- schema changes can break reports;
- domain boundaries become weaker;
- future service/module extraction becomes harder.

The assessment asks whether a reporting read model would be safer. A reporting read model is a reasonable architecture option to discuss.

## 6. Concurrent Inventory

Required invariant:

```text
available_stock >= 0
```

unless the business explicitly permits negative inventory.

Unsafe pattern:

```text
READ stock
IF enough stock
    UPDATE stock
```

Two cashiers can both read the same stock before either update finishes.

Possible safe techniques identified by the assessment:

- database transactions
- row locking
- optimistic concurrency
- atomic updates
- reservations

Example atomic update approach:

```sql
UPDATE inventory
SET available_stock = available_stock - :quantity
WHERE product_id = :product_id
  AND available_stock >= :quantity;
```

The application must check whether the update actually affected a row.

## 7. Idempotency Record

The assessment specifies storing:

- idempotency_key
- operation
- request_hash
- status
- result_reference
- created_at
- expires_at

Example:

```text
CHK-20260818-000123
```

Required behavior:

- first valid request processes once;
- retry with same key and same valid request returns the original result;
- the retry must not charge again;
- the retry must not create another order;
- the retry must not deduct inventory again.

The final proposal must include idempotency strategies for:

- checkout
- payment
- refund
- stock movement

Questions still needing explicit design choices:

- key retention period;
- behavior when the same key is used with different request data;
- behavior while the first request is still processing.
