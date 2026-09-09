# BrewHub Cafe - Domain Ownership and Boundaries

## 1. Purpose

This document defines what each BrewHub domain owns, what operations it exposes, and what other domains must not do. It is based on the implemented folders under `web/server/domains/` and the current database schema.

These domains are internal to the BrewHub Cafe System. They belong in domain or component documentation, not as separate external systems in the System Context Diagram.

## 2. Boundary Rule

Each business table has one owning domain. The owner defines the table's meaning, validation, state transitions, and write operations.

Another domain may:

- call an exposed owner-domain service operation;
- use an approved read-only query for reporting;
- append approved audit or telemetry evidence through a cross-cutting interface.

Another domain must not directly write the owner's tables or reproduce the owner's business rules.

## 3. Ownership Summary

| Domain | Owns | Main exposed operations | Must not allow |
|---|---|---|---|
| Authentication | `users`, `roles`, `user_roles`, `user_branches`, authentication session state | Authenticate users, manage sessions, authorize roles/permissions, manage staff accounts and staff profiles | Business domains changing identity/access data directly or client-supplied roles being trusted |
| Customer | `customers` | Register customer, retrieve active customer profile | Direct changes to orders, payments, inventory, roles, or staff accounts |
| Catalog | `categories`, `products` | Query orderable catalog, manage categories/products and prices | Direct inventory, order, or payment changes |
| Ordering | `orders`, `order_items` | Create, prepare, complete, cancel, recover, and retrieve orders | Payment, Inventory, or Reporting directly changing order state |
| Inventory | `inventory`, `inventory_reservations`, `stock_movements` | Reserve, release, receive, adjust, and query stock | Payment or Ordering directly editing stock tables or bypassing movement records |
| Payment | `payments` | Record payment results, retrieve payments, issue refunds | Direct changes to inventory, order state, catalog, or duplicate provider transactions |
| Reporting | Read models and reporting queries; no transactional tables | Manager reports and role-scoped dashboards | Any operational data mutation |
| Idempotency | `idempotency_keys` | Hash, begin, replay, conflict-check, and finish idempotent operations | Business mutations or reuse of one key for different request data |
| Observability | `request_logs`, `telemetry_events`, alert/performance definitions | Record and query logs, telemetry, performance, security metrics, and alerts | Business-state changes or storage/exposure of secrets and sensitive payloads |
| Audit capability | `audit_logs` as append-only evidence | A centralized append operation is recommended but not yet implemented | Updating/deleting history or letting clients choose trusted actor/before/after values |

## 4. Authentication Domain

**Location:** `web/server/domains/authentication/`

### Owns

- `users`;
- `roles`;
- `user_roles`;
- `user_branches`;
- password verification rules;
- authenticated session creation, lookup, and clearing;
- role and permission policy;
- staff account lifecycle and permitted staff profile fields.

### Exposes

- `findAuthenticationUserByUsername()`;
- `findAuthenticationUserByEmail()`;
- `authenticateUser()`;
- `createAuthSession()`;
- `getCurrentUser()`;
- `requireUser()`;
- `clearAuthSession()`;
- `requireRole()`;
- `requireAnyRole()`;
- `requirePermission()`;
- `listStaffUsers()`;
- `createStaffUser()`;
- `updateStaffUserRole()`;
- `getStaffProfile()`;
- `updateStaffProfile()`.

### Must not allow

- Ordering, Inventory, Payment, Catalog, or Reporting to modify users, roles, or access assignments directly;
- the browser to choose or elevate its own role;
- inactive or invalid accounts to establish authenticated sessions;
- password hashes, session secrets, or protected authentication fields to appear in API responses or logs;
- page middleware to be treated as the security boundary; protected APIs must authorize again on the server;
- staff profile updates to silently change IDs, usernames, roles, branch assignments, passwords, or account status.

### Current implementation note

`Customer.repository.insertCustomerAccount()` currently creates both a `users` row and a `customers` row in one transaction. This preserves registration atomicity, but it crosses the intended ownership boundary. A cleaner interface would expose an Authentication-owned account-creation operation that coordinates with Customer without giving Customer general write access to `users`.

`user_branches` is modeled as Authentication-owned access data, but branch-assignment management and enforcement are not yet exposed by the implemented Authentication services.

## 5. Customer Domain

**Location:** `web/server/domains/customer/`

### Owns

- `customers`;
- customer number and customer profile meaning;
- customer activation state;
- the relationship between a customer profile and its authenticated user identity.

### Exposes

- `registerCustomer()`;
- `getActiveCustomerByUserId()`;
- internal repository lookups such as `findCustomerByUserId()` and `findCustomerByEmail()`.

### Must not allow

- a customer to read or update another customer's profile;
- direct modification of `orders`, `order_items`, `payments`, inventory tables, product prices, roles, or staff records;
- Customer code to decide payment success or order completion;
- unvalidated or duplicate customer registration data;
- inactive customer profiles to be treated as active ordering identities.

### Allowed collaboration

- use Authentication to find or create the associated login identity;
- provide the active customer identity to Ordering;
- allow Reporting to read customer-related data through approved read-only reporting queries when required.

## 6. Catalog Domain

**Location:** `web/server/domains/catalog/`

### Owns

- `categories`;
- `products`;
- SKU, product name, description, base price, inventory-tracking flag, and active/orderable status;
- catalog-management validation and price-change audit data.

### Exposes

- `getProducts()`;
- `getCategories()`;
- `getOrderableProducts()`;
- `listManagedProducts()`;
- `getManagedProduct()`;
- `createManagedProduct()`;
- `editManagedProduct()`;
- `listManagedCategories()`;
- `createManagedCategory()`.

### Must not allow

- Inventory to change product descriptions, categories, active status, or base prices;
- Ordering or the browser to override the authoritative product price;
- direct modification of inventory balances, reservations, orders, order items, or payments;
- inactive or non-orderable products to be sold through normal order creation;
- price changes without the required actor, reason, concurrency check, and audit evidence;
- duplicate SKU/category values where uniqueness is required.

### Allowed collaboration

- provide authoritative product snapshots and prices to Ordering;
- allow Inventory to reference product identity without owning Catalog data;
- allow Reporting to read product/category information in read-only sales reports.

## 7. Ordering Domain

**Location:** `web/server/domains/ordering/`

### Owns

- `orders`;
- `order_items`;
- order source, type, status, totals, timestamps, and lifecycle transitions;
- immutable item snapshots used by an order;
- customer and POS order preparation, completion, cancellation, and expired-order recovery workflows.

### Exposes

- `createCustomerOrder()`;
- `createPosOrder()`;
- `prepareCustomerOrderForPayment()`;
- `preparePosOrderForPayment()`;
- `completeCustomerCheckout()`;
- `completePosCheckout()`;
- `cancelCustomerOrder()`;
- `cancelStaffOrder()`;
- `getRecentStaffOrders()`;
- `getStaffOrderDetails()`;
- `getCustomerOrders()`;
- `getCustomerOrder()`;
- repository-owned state operations such as `completeOrder()`, `cancelOrder()`, and `recoverExpiredPendingOrders()`.

### Must not allow

- Reporting, Payment, Inventory, Catalog, or the browser to directly change order status or order items;
- client-supplied prices or totals to become authoritative;
- completion before required stock and payment rules succeed;
- the same logical checkout to create duplicate orders, payments, or stock effects;
- a customer to retrieve or cancel an order owned by another customer;
- invalid state transitions, such as refund logic directly rewriting an order into an unrelated status;
- a payment timeout with unknown outcome to be treated automatically as a declined payment.

### Allowed collaboration

- obtain customer identity from Customer;
- obtain authoritative product data and price snapshots from Catalog;
- call Inventory's reservation/release operations;
- call Payment's record/refund-aware operations rather than writing `payments`;
- emit telemetry through Observability;
- use Idempotency around duplicate-sensitive workflows.

## 8. Inventory Domain

**Location:** `web/server/domains/inventory/`

### Owns

- `inventory` balances;
- `inventory_reservations`;
- `stock_movements`;
- the meaning of on-hand, reserved, and available stock;
- concurrency rules for stock reservation, release, receiving, and adjustment.

### Exposes

- `getInventoryByBranch()`;
- `getInventoryByProduct()`;
- `getActiveOrderReservations()`;
- `getOrderReservations()`;
- `getStockMovementHistory()`;
- `getStockMovementTotal()`;
- `reserveStockForOrder()`;
- `releaseStockReservation()`;
- `receiveInventoryStock()`;
- `adjustInventoryStock()`.

The repository maps these operations to database routines such as `fn_reserve_stock`, `fn_release_reservation`, `fn_receive_stock`, and `fn_adjust_stock`.

### Must not allow

- Payment, Ordering, Catalog, Reporting, or browser code to directly edit stock tables;
- normal sale operations to make available stock negative;
- stock quantity changes without a corresponding reservation or stock-movement record;
- the same reservation or release request to deduct or restore stock more than once;
- stock adjustment or receiving without a validated actor, branch, product, quantity, and reason/reference where required;
- one branch's stock request to change another branch's balances without an explicit authorized workflow.

### Allowed collaboration

- accept reservation and release requests from Ordering;
- reference Catalog product identity without owning product details;
- emit failures and performance events through Observability;
- provide read-only stock data to Reporting.

## 9. Payment Domain

**Location:** `web/server/domains/payment/`

### Owns

- `payments`;
- payment transaction type and status;
- amount, method, provider, provider reference, failure reason, and payment timestamps;
- refund records and payment-reference uniqueness rules.

### Exposes

- `getPaymentsByOrder()`;
- `recordPaymentResult()`;
- `refundOrderPayment()`;
- repository lookups such as `findPaymentByProviderReference()`.

### Must not allow

- direct modification of `orders`, `order_items`, inventory balances, reservations, movements, products, or categories;
- Payment to deduct or restore stock;
- duplicate logical payments or duplicate provider references;
- a refund without a valid completed payment/order context and authorized actor;
- a payment timeout to be treated automatically as success or decline when the provider outcome is unknown;
- sensitive card or wallet credentials to be stored in BrewHub payment records or logs.

### Allowed collaboration

- receive order/payment context from Ordering;
- return the payment outcome so Ordering can perform the order transition;
- append refund audit evidence;
- emit payment telemetry through Observability;
- use Idempotency for retry-safe payment and refund processing.

### Current implementation note

The domain records provider names/references and supports simulated outcomes, but no live production payment gateway or reconciliation webhook is implemented. An external provider remains a future integration.

## 10. Reporting Domain

**Location:** `web/server/domains/reporting/`

### Owns

- no transactional business tables;
- read-only reporting queries;
- report summaries and dashboard projections;
- reporting time-window and aggregation logic.

### Exposes

- `getManagerReportSummary()`;
- `getDashboardSummary()`;
- supporting read operations for sales, refunds, top products, payment summaries, low stock, and role-scoped dashboards.

### Must not allow

- reports or dashboards to insert, update, or delete operational data;
- Reporting to complete/cancel orders, issue refunds, adjust inventory, change prices, or manage users;
- a report parameter to bypass customer ownership, staff identity, role, or branch scope;
- report queries to become an alternative write path into another domain;
- expensive report work to destabilize transactional checkout and POS workloads as the system grows.

### Approved cross-domain access

Reporting currently reads `branches`, `orders`, `order_items`, `payments`, `products`, `inventory`, and `users`. This is an intentional read-only boundary crossing. If reporting load or schema coupling becomes significant, replace direct operational joins with a reporting read model, replica, or asynchronously maintained projection.

## 11. Idempotency Domain

**Location:** `web/server/domains/idempotency/`

### Owns

- `idempotency_keys`;
- idempotency key, operation name, actor/scope, request hash, processing state, result reference, stored response, and expiry meaning;
- duplicate, conflict, processing, and replay decisions.

### Exposes

- `createRequestHash()`;
- `beginIdempotentOperation()`;
- `finishIdempotentOperation()`;
- database operations `fn_begin_idempotent_request` and `sp_finish_idempotent_request` through its repository.

### Must not allow

- one key to be reused with different request data;
- a completed result to be silently replaced by a later retry;
- concurrent retries to execute the same protected business mutation independently;
- idempotency code to create orders, deduct stock, or record payments itself;
- arbitrary client data to be treated as a trusted stored result;
- records to remain indefinitely without an explicit retention/expiry policy.

### Allowed collaboration

- wrap duplicate-sensitive Ordering and Payment operations;
- store only the request identity and result reference/response needed for safe replay;
- emit duplicate, conflict, processing, and success telemetry through Observability.

### Current implementation note

The Idempotency service is currently called by the development customer payment-simulation endpoint. The POS completion and manager refund endpoints do not yet wrap their mutations with this service, so the intended payment/refund idempotency rule is not fully enforced across all entry points.

## 12. Observability Domain

**Location:** `web/server/domains/observability/`

### Owns

- `request_logs`;
- `telemetry_events`;
- telemetry event names and metadata conventions;
- performance thresholds and duration evaluation;
- alert definitions and alert evaluation logic;
- read-oriented operational, database, security, checkout, payment, inventory, and idempotency measurements.

### Exposes

- `recordTelemetryEvent()`;
- `recordCheckoutStage()`;
- `recordPerformanceSample()`;
- `recordCheckoutWorkflowPerformance()`;
- `getRecentRequestLogs()`;
- `getApplicationTelemetry()`;
- `getDatabaseTelemetry()`;
- `getPerformanceTelemetry()`;
- `getSecurityTelemetry()`;
- `getAlertTelemetry()`;
- individual alert evaluators for checkout failures, critical queries, payment timeouts, negative-stock attempts, and repeated login failures.

### Must not allow

- telemetry collection to change orders, payments, inventory, products, customers, or access rights;
- raw passwords, session secrets, database credentials, payment secrets, or unnecessary personal data in logs/metadata;
- public telemetry submission to bypass validation, size limits, sampling, or rate controls;
- normal telemetry-write failure to corrupt or partially perform a business transaction;
- unrestricted users to read operational logs, security metrics, or internal database details;
- alert evaluation to become the source of truth for business state.

### Allowed collaboration

- receive sanitized events and identifiers from all domains;
- read its own telemetry stores and approved PostgreSQL operational statistics;
- provide read-only telemetry and alerts to authorized administrators.

## 13. Audit Capability

**Current implementation:** Cross-cutting capability; no dedicated `web/server/domains/audit/` folder exists.

### Owns

- `audit_logs` as immutable evidence of sensitive actions;
- actor, action, resource, resource ID, branch, before/after data, reason, trace ID, and event timestamp semantics.

### Currently exposed behavior

There is no centralized audit service. Authentication staff management/profile changes, Catalog price changes, and Payment refunds currently append audit records directly during their database transactions.

A recommended future interface is:

- `appendAuditEvent()` for use inside the caller's business transaction;
- `getAuditEvents()` for tightly authorized audit review, if required.

### Must not allow

- updates or deletion of historical audit evidence through normal application workflows;
- the browser to supply trusted actor identity, before state, or event timestamp;
- audit records to replace operational logs or telemetry;
- sensitive secrets or full payment credentials in before/after data;
- sensitive changes to succeed without required audit evidence when audit is part of the same atomic operation;
- unrestricted access to the audit trail.

### Current ownership gap

Multiple domains import and insert `auditLogs` directly. This is a controlled append-only pattern, but it conflicts with a strict "one domain writes one table" rule. The architecture should explicitly adopt either:

1. an Audit-owned append interface that participates in the caller's transaction; or
2. a documented shared append-only audit table exception with a common schema and validation helper.

## 14. Unassigned Branch Master Data

The schema includes `branches`, but there is no implemented Branch domain. Ordering and Reporting read the `MAIN` branch, while Authentication conceptually owns staff-to-branch assignments through `user_branches`.

Before multi-branch rollout, assign ownership as follows:

- a Branch Administration domain owns branch identity, code, name, timezone, and active state;
- Authentication owns only user-to-branch access assignments;
- Ordering, Inventory, and Reporting consume branch identity and scope through exposed interfaces or validated identifiers;
- no actor may select an arbitrary branch without server-side assignment checks.

## 15. Implemented Cross-Domain Dependencies

| Caller domain | Called/read domain | Reason |
|---|---|---|
| Customer | Authentication | Look up the associated identity during registration. |
| Ordering | Customer | Resolve the active customer for customer-owned orders. |
| Ordering | Catalog | Resolve orderable products and authoritative price snapshots. |
| Ordering | Inventory | Reserve and release stock. |
| Ordering | Payment | Record/query payment results during checkout. |
| Ordering | Observability | Record checkout stages, outcomes, and performance. |
| Inventory | Observability | Record reservation, adjustment, and stock-failure telemetry. |
| Authentication authorization | Observability | Record authorization/security outcomes. |
| Reporting | Operational domains, read-only | Produce aggregate dashboards and reports without mutations. |

## 16. Universal Must-Not Rules

- A domain must not directly write another domain's owned business table.
- A client must not choose trusted identity, role, branch access, price, total, payment result, or audit actor information.
- Cross-domain workflows must call service-level operations rather than repository or table internals.
- Reporting and Observability are read/record-oriented concerns and must not become operational mutation paths.
- Every stock change must follow Inventory rules and create traceable movement/reservation evidence.
- Every order transition must follow Ordering's allowed state transitions.
- Every payment/refund must follow Payment uniqueness and idempotency rules.
- Sensitive access, price, stock, cancellation, and refund changes require appropriate authorization and audit/telemetry evidence.
- Failure in one domain must not leave another domain in a silently inconsistent state; use transactions, idempotency, compensation, or reconciliation as appropriate.
- Branch-owned operations must be checked against the authenticated actor's permitted branch scope.

## 17. Review Checklist

- Every implemented domain has a named owner and responsibility.
- Every transactional table has one owner or an explicitly documented append-only exception.
- Public service operations are distinguished from repository implementation details.
- Cross-domain dependencies use service interfaces.
- Reporting access is read-only.
- Payment cannot edit Inventory.
- Reporting cannot change Ordering.
- Ordering cannot write Payment or Inventory tables directly.
- Client values are revalidated by the owning domain.
- Audit, telemetry, idempotency, concurrency, and branch-scope rules are explicit.
