# Role dashboards

The existing landing pages now include live database-backed statistics, a daily bar chart, and a status doughnut chart. Existing workspace links and customer profile content remain available.

| Role | Page | Statistics and scope |
| --- | --- | --- |
| Admin | `/admin` | All current user accounts, active/inactive access, registrations in the selected period |
| Manager | `/staff/manager` | All MAIN branch orders created in the selected period, completed totals, pending checkout |
| Cashier | `/staff/cashier` | Only MAIN branch orders created by the signed-in cashier |
| Customer | `/account` | Only MAIN branch orders belonging to the signed-in user's active customer profile |

## Period and calculation rules

- Choose 7 or 30 calendar days, including today, using the MAIN branch's configured timezone. Missing dates appear as zero activity.
- Order charts and metrics select orders by **creation date**. Completed counts and sales/spending use orders whose **current status** is `COMPLETED`.
- Completed-order money is the sum of order totals. It is not a net settlement report; partial refunds are not deducted. Cancelled/refunded orders not currently marked completed are excluded. The existing manager reports remain available for payment/refund reporting.
- Admin account counts and access status are current snapshots, independent of the selected registration period. Accounts include staff and customers.
- Scope is fixed to MAIN for order dashboards, consistent with the current reporting service. No branch selector is introduced.
- Refresh reloads the aggregate data. Loading and errors are shown explicitly; failures are not represented as zero statistics. Empty periods have an explicit empty state.

## Authorization

`GET /api/dashboard/:role?days=7|30` enforces the exact requested staff role through the existing database-backed authorization helper. Customer access requires an authenticated non-staff user and an active customer profile.

The authenticated user/customer identifiers are passed into SQL ownership predicates. Client-supplied user, customer, or branch IDs cannot change the scope. Responses use `Cache-Control: private, no-store`. Queries return aggregate statistics, not other users' order details. No schema changes or business-data writes were added.

## Implementation

- `web/app/components/dashboard/RoleDashboard.vue`: shared responsive metrics, bar/doughnut charts, period control, refresh, loading/error/empty states. Uses existing BrewHub colors and CSS, with no charting dependency. Daily values are also available in a disclosure table; doughnut values appear in its labeled legend.
- `web/app/pages/admin/index.vue`, `web/app/pages/staff/manager/index.vue`, `web/app/pages/staff/cashier/index.vue`, `web/app/pages/account/index.vue`: role-specific placement.
- `web/shared/types/dashboard.ts`: shared response types.
- `web/server/api/dashboard/[role].get.ts`: authentication, role checks, period validation, no-store response.
- `web/server/domains/reporting/dashboard-service.ts`: metric definitions and timezone-aware date filling.
- `web/server/domains/reporting/dashboard-repository.ts`: read-only aggregate SQL with branch and ownership predicates.

## Verification

- Lint, typecheck, and all 10 architecture checks passed.
- Dashboard suite: 24 tests passed with `DASHBOARD_DB_CHECK=1`, including role enforcement, denied/unauthenticated requests, ownership, invalid periods, timezone date filling, totals, generated daily SQL, and read-only PostgreSQL execution. Without this environment variable, the live database test is skipped.
- Production build passed (exit code 0).
- The actual repository queries have passed against the configured PostgreSQL database for admin accounts and branch/cashier/customer order scopes, for both 7 and 30 days. The test uses read-only connections and does not print records or credentials. Authenticated browser flows and rendered layouts remain unverified.

### Daily grouping regression fix

PostgreSQL rejected the original daily queries with error 42803 because repeating the timezone expression in SELECT/GROUP BY/ORDER BY generated distinct parameter references. Both queries now select the expression as `activity_day` and group/order by that alias, keeping the timezone parameter bound. Regression coverage exercises the complete generated SQL and optionally executes the real repository queries on PostgreSQL.

For visual acceptance, inspect all four signed-in roles at 320px, 768px, and 1440px; switch periods, refresh, expand chart values, and check populated, empty, and error states. Thirty-day bars scroll inside their chart container.
