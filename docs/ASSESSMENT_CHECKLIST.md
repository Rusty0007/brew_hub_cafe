# BrewHub Cafe — TESDA Assessment Checklist

Use this while building the project and preparing the final presentation/submission.

## Task 1 — Domains and Ownership

- [ ] Define Customer responsibility
- [ ] Define Catalog responsibility
- [ ] Define Ordering responsibility
- [ ] Define Payment responsibility
- [ ] Define Inventory responsibility
- [ ] Define Authentication responsibility
- [ ] Define Reporting responsibility
- [ ] State owned data for every domain
- [ ] State exposed operations
- [ ] State forbidden direct operations
- [ ] Explain why Payment cannot directly update Inventory tables

## Task 2 — Database Relationships

- [ ] ERD contains users
- [ ] ERD contains customers
- [ ] ERD contains categories
- [ ] ERD contains products
- [ ] ERD contains orders
- [ ] ERD contains order_items
- [ ] ERD contains payments
- [ ] ERD contains inventory
- [ ] ERD contains stock_movements
- [ ] Mark primary keys
- [ ] Mark foreign keys
- [ ] Mark 1:1 relationships where applicable
- [ ] Mark 1:M relationships
- [ ] Explain Orders <-> Products M:N through order_items
- [ ] Mark optional relationships

## Task 3 — SQL JOIN Decisions

- [ ] Customers who purchased
- [ ] All customers including no purchase
- [ ] Customers who never purchased
- [ ] Every product including never sold
- [ ] Only products sold yesterday
- [ ] Every product with inventory, including missing inventory row
- [ ] State JOIN condition for each
- [ ] State JOIN type for each
- [ ] Explain why that JOIN type is correct

## Task 4 — Cross-Domain JOINs

- [ ] Identify ownership boundary crossings
- [ ] Explain coupling risks
- [ ] Explain effect of schema changes
- [ ] Discuss reporting read model

## Task 5 — Idempotent Checkout

- [ ] Define idempotency key
- [ ] Store request hash
- [ ] Store processing status
- [ ] Store result reference
- [ ] Define expiry
- [ ] Same request retry returns original result
- [ ] Prevent duplicate charge
- [ ] Prevent duplicate order
- [ ] Prevent duplicate stock deduction
- [ ] Define same key + different data behavior
- [ ] Define first request still processing behavior

## Task 6 — Concurrent Inventory

- [ ] Preserve available_stock >= 0
- [ ] Explain check-then-update race
- [ ] Use transaction/locking/atomic update/reservation
- [ ] Demonstrate two-cashier last-stock scenario

## Task 7 — Failure Behavior

- [ ] Inventory unavailable
- [ ] Payment timeout
- [ ] Database failure
- [ ] Add failure scenario #4
- [ ] Add failure scenario #5
- [ ] Define system response
- [ ] Define user response
- [ ] Define telemetry for every failure

## Task 8 — Observability

- [ ] request_id
- [ ] trace_id
- [ ] user_id
- [ ] branch_id
- [ ] order_id
- [ ] Trace checkout from start to finish

## Task 9 — Telemetry

- [ ] Application telemetry
- [ ] Database telemetry
- [ ] Inventory telemetry
- [ ] Payment telemetry
- [ ] Idempotency telemetry
- [ ] Security telemetry

## Task 10 — Performance

For every required operation:

- [ ] Target
- [ ] Measuring telemetry
- [ ] Warning threshold
- [ ] Critical threshold
- [ ] Investigation steps

Operations:

- [ ] Login
- [ ] Product list
- [ ] Product search
- [ ] Add item
- [ ] Checkout
- [ ] Inventory reservation
- [ ] Standard report

## Task 11 — Alerts

Create at least five.

- [ ] Checkout failure rate
- [ ] Slow/critical DB query
- [ ] Payment timeout increase
- [ ] Negative stock attempt
- [ ] Repeated authentication failure

## Task 12 — Structured Logs

- [ ] Successful login
- [ ] Failed login
- [ ] Inventory reservation
- [ ] Payment success
- [ ] Payment timeout
- [ ] Order cancellation

## Task 13 — Audit vs Operational Logs

Decide audit requirements for:

- [ ] User login
- [ ] Price changed
- [ ] Product viewed
- [ ] Order cancelled
- [ ] Inventory adjusted
- [ ] Report viewed
- [ ] Payment refunded
- [ ] User role changed

Audit-sensitive records should consider:

- [ ] actor
- [ ] action
- [ ] resource
- [ ] resource_id
- [ ] before
- [ ] after
- [ ] timestamp
- [ ] reason

## Task 14 — Architecture-Aware Linting

- [ ] At least 8 pre-deployment rules
- [ ] Architecture boundary rules
- [ ] Database rules
- [ ] Security rules
- [ ] Observability rules
- [ ] Idempotency rules

## Task 15 — Growth / Stress Scenario

- [ ] 20 branches
- [ ] 20,000 orders/day
- [ ] Delivery
- [ ] Loyalty
- [ ] Supplier Purchasing
- [ ] Accounting
- [ ] Online Ordering
- [ ] Explain what remains unchanged
- [ ] Explain what must scale
- [ ] Decide table-sharing policy
- [ ] Identify queue candidates
- [ ] Identify stronger idempotency needs
- [ ] Identify important telemetry
- [ ] Identify data requiring branch_id
- [ ] Decide branch internet-loss behavior
- [ ] Decide reporting database strategy
- [ ] Explain module isolation

# Final Architecture Proposal

The final submission must contain:

- [ ] 1. System context diagram
- [ ] 2. Component diagram
- [ ] 3. ERD
- [ ] 4. At least 5 JOIN decisions with justification
- [ ] 5. Idempotency strategy for checkout, payment, refund, and stock movement
- [ ] 6. At least 5 failure scenarios and handling strategies
- [ ] 7. Telemetry plan: logs, metrics, traces, audit events
- [ ] 8. System parameters: load, concurrency, latency, availability, growth, retention
- [ ] 9. At least 10 architectural rules
