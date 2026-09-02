# BrewHub Cafe — Requirements

## 1. Business Scenario

BrewHub Cafe is moving from manual records to a web-based ordering and inventory system.

Initial deployment:

- 1 branch

Expected future growth:

- up to 20 branches
- delivery
- loyalty
- supplier purchasing
- accounting
- online ordering

## 2. Required Capabilities

The system must support:

1. Customers
2. Products and categories
3. Orders
4. Order items
5. Payments
6. Inventory
7. Stock movements
8. Staff accounts
9. Audit trail
10. Management reports
11. Authentication
12. Observability

## 3. Expected System Parameters

| Parameter | Requirement |
|---|---:|
| Staff accounts | 30 |
| Concurrent users | 10 |
| Products | Up to 5,000 |
| Customers | Up to 50,000 |
| Orders/day | Approx. 1,000 |
| Average order items/order | 4 |
| Stock movements/day | Up to 10,000 |
| Initial branches | 1 |
| Expected branches | Up to 20 |
| Availability target | 99.5% |
| Normal page response | < 800 ms |
| Checkout | < 2 seconds |
| Normal report | < 5 seconds |
| Database | Relational |
| Authentication | Required |
| Audit trail | Sensitive actions |
| Idempotency | Order completion and payments |
| Observability | Logs, metrics, traces |

## 4. Detailed Performance Targets

| Operation | Target |
|---|---:|
| Login | < 800 ms |
| Product list | < 500 ms |
| Product search | < 700 ms |
| Add item | < 300 ms |
| Inventory reservation | < 500 ms |
| Checkout | < 2,000 ms |
| Standard report | < 5 seconds |

## 5. Required Architectural Domains

The assessment requires the following domains:

- Authentication
- Customer
- Catalog
- Ordering
- Inventory
- Payment
- Reporting

Observability is a cross-cutting concern across all domains.

## 6. Required Reliability Behaviors

The solution must address:

- idempotent checkout
- duplicate payment prevention
- duplicate stock deduction prevention
- concurrent inventory updates
- transaction rollback
- payment timeout handling
- compensation/recovery behavior
- auditability of sensitive changes
- traceability of important workflows

## 7. Growth Scenario

The architecture must be explainable when BrewHub grows to:

- 20 branches
- about 20,000 orders/day

and introduces:

- Delivery
- Loyalty
- Supplier Purchasing
- Accounting
- Online Ordering

The assessment specifically expects consideration of:

- what remains unchanged;
- what must scale;
- whether modules should share tables;
- which workflows need queues;
- stronger idempotency requirements;
- branch-specific data;
- branch internet loss;
- reporting database strategy;
- preventing one module from destabilizing the whole system.
