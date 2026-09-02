# BrewHub Cafe — Architecture Notes

## 1. Domain Ownership

### Authentication

**Responsibility**

- authenticate staff users
- manage authorization and roles

**Owns**

- users
- authentication-related data

**Must not**

- directly modify orders, payments, or inventory

---

### Customer

**Responsibility**

- customer records
- customer lookup and updates

**Owns**

- customers

**Must not**

- directly modify payments or inventory

---

### Catalog

**Responsibility**

- product and category information
- product pricing

**Owns**

- categories
- products

**Must not**

- directly modify inventory balances or payment records

---

### Ordering

**Responsibility**

- create and manage orders
- create order items
- complete or cancel orders

**Owns**

- orders
- order_items

**Typical operations**

- createOrder()
- completeOrder()

**Must not**

- allow Reporting to change orders

---

### Inventory

**Responsibility**

- inventory balances
- stock reservations
- receiving stock
- releasing reservations
- stock movements

**Owns**

- inventory
- stock_movements

**Typical operations**

- reserve()
- release()
- receive()

**Must not**

- allow Payment to directly edit stock

---

### Payment

**Responsibility**

- payment processing
- payment status
- refunds

**Owns**

- payments

**Must not**

- directly update Inventory tables

---

### Reporting

**Responsibility**

- management reports
- read-oriented business views

**Must not**

- modify operational domain data

## 2. Why Payment Must Not Directly Edit Inventory

Payment and Inventory are separate domains.

If Payment directly edits Inventory tables:

- domain ownership becomes unclear;
- changes to Inventory schema can break Payment;
- inventory business rules can be bypassed;
- audit logic can be skipped;
- testing becomes harder;
- future module separation becomes harder.

Instead, Payment should report the payment result and Inventory should perform inventory operations through its own defined interface or workflow.

## 3. Checkout Workflow

Required workflow:

1. Create Order
2. Reserve Stock
3. Authorize Payment
4. Complete Order

Important rule:

A payment timeout does not automatically mean the payment failed.

If the payment outcome is unknown, BrewHub should keep enough state to verify/reconcile the payment before attempting another charge.

## 4. Observability Identifiers

Important workflows should carry identifiers such as:

- request_id
- trace_id
- user_id
- branch_id
- order_id

Example logical checkout trace:

```text
checkout.start
order.create
inventory.reserve
payment.authorize
payment.timeout
inventory.release
order.payment_pending
```

## 5. Required Telemetry Areas

### Application

- requests_total
- requests_failed_total
- request_duration_ms
- active_users
- checkout_total
- checkout_success_total
- checkout_failure_total

### Database

- db_query_duration_ms
- db_query_count
- db_connection_count
- db_connection_wait_ms
- slow_query_total
- transaction_rollback_total
- deadlock_total

### Inventory

- inventory_reservation_total
- inventory_reservation_failed_total
- stock_adjustment_total
- negative_stock_attempt_total
- stock_movement_total

### Payment

- payment_attempt_total
- payment_success_total
- payment_failed_total
- payment_timeout_total
- duplicate_payment_prevented_total
- payment_duration_ms

### Idempotency

- idempotency_request_total
- idempotency_duplicate_total
- idempotency_conflict_total
- idempotency_processing_total

### Security

- login_success_total
- login_failure_total
- authorization_denied_total
- rate_limit_triggered_total
- csrf_failure_total

## 6. Suggested Architecture Rules

The assessment requires at least ten rules in the final proposal.

### Required/example-derived rules

- **ARCH-001** A module may not directly write another module's table.
- **ARCH-002** Cross-domain dependencies must be declared.
- **DB-001** Foreign keys must reference indexed keys.
- **SEC-001** Sensitive state-changing endpoints require authorization.
- **OBS-001** Critical transactions propagate `trace_id`.
- **IDEMP-001** Payment endpoints support idempotency keys.

### Proposed additional rules

These are design recommendations, not explicit wording from the assessment:

- **INV-001** Normal sale operations must never make available stock negative.
- **INV-002** Every inventory quantity change must create a stock movement or equivalent auditable record.
- **ORDER-001** Order completion must be idempotent.
- **PAY-001** A payment timeout must not automatically be treated as a declined payment.
- **AUD-001** Sensitive changes must record actor, action, resource, timestamp, and relevant before/after values.
- **REPORT-001** Reporting code is read-only against operational domains.
- **BRANCH-001** Branch-owned transactional data must include a branch identifier once multi-branch operation is introduced.
- **OBS-002** Checkout, payment, refund, and inventory failures must emit structured telemetry.
