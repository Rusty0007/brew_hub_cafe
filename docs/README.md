# BrewHub Cafe

BrewHub Cafe is a web-based ordering and inventory system intended to replace manual cafe records.

## Current Scope

The TESDA architecture assessment requires BrewHub to support:

- Customers
- Products and categories
- Orders and order items
- Payments
- Inventory and stock movements
- Staff accounts
- Audit trail
- Management reports
- Authentication
- Observability through logs, metrics, and traces

The first deployment serves one branch, but the architecture should support future growth to up to 20 branches and future modules such as:

- Delivery
- Loyalty
- Supplier purchasing
- Accounting
- Online ordering

## Documentation

See the `docs/` folder:

- `REQUIREMENTS.md` — confirmed requirements and system parameters
- `ARCHITECTURE.md` — domains, responsibilities, boundaries, and architectural rules
- `DATABASE_NOTES.md` — required tables, relationships, JOIN guidance, concurrency, and idempotency
- `ASSESSMENT_CHECKLIST.md` — TESDA tasks and final submission checklist
- `OPEN_QUESTIONS.md` — business rules that are not defined by the assessment and still need decisions

## Important Principle

BrewHub should not only work during the happy path.

The architecture must remain correct when:

- two users act at the same time;
- a payment succeeds but the browser retries;
- the network disconnects;
- the database transaction fails;
- a payment provider times out;
- the system grows to multiple branches.
