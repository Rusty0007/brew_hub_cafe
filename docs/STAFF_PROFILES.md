# Manager and cashier profiles

## Access

- Managers and cashiers open **My staff profile** from their workspace. `/staff/profile` shows only the authenticated user's record.
- Admins click a manager/cashier name in **User Management** to open `/admin/users/:id`.
- Profiles show the stable account ID, username, display name, contact email, assigned roles, active/inactive account status, account creation date, last sign-in, and a responsibility summary.
- Dates are explicitly shown in Asia/Manila. Account creation is not presented as an employment start date.

## Controlled corrections

Only an administrator can correct a manager/cashier's name or contact email. A reason is required. The API rejects unknown/protected fields, including role, status, username, branch, ID, and password fields. Existing role management remains separate.

The database update locks the user and existing role assignments, verifies a single manager/cashier role, checks the loaded profile version, and writes the correction and before/after audit record in one transaction. Duplicate email conflicts and stale versions return explicit errors. Administrator and multi-role profiles cannot be edited by this endpoint.

Staff can view their profiles but cannot rename themselves or change their access through this feature. Profile reads and writes return `Cache-Control: private, no-store`. Neither password hashes nor unrelated customer/employee records are returned.

## Files

- `web/app/components/staff/ProfilePanel.vue`: shared responsive profile display and admin correction form.
- `web/app/pages/staff/profile.vue`: authenticated manager/cashier self-profile.
- `web/app/pages/admin/users/[id].vue`: administrator profile view and editor.
- `web/app/pages/staff/cashier/index.vue`, `web/app/pages/staff/manager/index.vue`: profile entry points.
- `web/app/pages/admin/users/index.vue`: manager/cashier profile links.
- `web/server/api/staff/profile.get.ts`: session-scoped profile read.
- `web/server/api/admin/users/[id]/profile.get.ts` and `profile.patch.ts`: admin-only target profile access and validated correction.
- `web/server/domains/authentication/staff-profile-service.ts`: profile selection, validation, concurrency handling, and atomic audit writes.
- `web/tests/staff-profile.test.ts`, `web/vitest.profile.config.ts`: focused authorization/schema/transaction tests.

## Validation and scope

Lint, typecheck, architecture checks, production build, and all 15 profile tests passed. Tests use mocked database/authorization boundaries; live editing and rendered browser flows remain unverified.

No schema migration was needed. Employment start dates, phone/address fields, branch assignment management, shifts, approval limits, cash reconciliation, and employee performance records are future work. The responsibility summary does not introduce those controls or change existing authorization rules.
