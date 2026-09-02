# BrewHub Cafe — Authentication & Authorization Development Documentation

> Development documentation for BrewHub Cafe staff authentication and authorization.
>
> This document is intended to be stored in the project repository (for example under `docs/`) and updated as implementation progresses.

---

## 1. Purpose

This document records the development plan, implementation responsibilities, expected behavior, security rules, test cases, and completion criteria for the first two security phases of the BrewHub Cafe web application:

```text
Phase 1 — Authentication
Phase 2 — Authorization
```

The goal is to keep authentication and authorization behavior explicit and consistent across the Nuxt frontend, server API, domain services, and PostgreSQL database.

---

# Phase 1 — Authentication

## Status

```text
Phase 1 — Authentication
✓ identify user
✓ verify password
✓ active-account check
✓ create secure session
✓ login
✓ logout
✓ current user
✓ protect authenticated pages/API
✓ update last_login_at
```

Phase 1 is considered the identity and session foundation of BrewHub Cafe.

Authentication answers:

> Who is the current user?

The authenticated user becomes the actor used later by Authorization, Audit, Ordering, Inventory, Payment, Catalog management, and Reporting.

---

## 2. Authentication Domain Responsibility

The Authentication domain is responsible for:

- identifying BrewHub staff users;
- validating login credentials;
- verifying password hashes;
- rejecting inactive accounts;
- creating secure authenticated sessions;
- resolving the current logged-in user;
- logging users out;
- protecting authenticated pages and server endpoints;
- updating login metadata such as `last_login_at`.

Authentication must not directly perform business operations belonging to other domains.

Examples:

```text
Authentication may identify a cashier.
Authentication must not directly create an order.

Authentication may identify a manager.
Authentication must not directly change inventory.

Authentication may expose the current user's role.
Authentication must not directly update product prices.
```

---

## 3. Identify User

### Goal

Locate the staff account that is attempting to authenticate.

### Expected flow

```text
Login request
    ↓
Validate login identifier
    ↓
Authentication repository
    ↓
Find matching user
    ↓
Return authentication-safe user record
```

The exact login identifier depends on the BrewHub `users` table.

Possible identifiers include:

```text
username
email
```

The project should use the identifier already defined by the existing database design.

### Important rules

- the login identifier should be unique;
- normalize the identifier when appropriate;
- do not expose whether an account exists in public login error messages;
- do not return sensitive authentication fields to the browser.

### Repository responsibility

A repository function may look conceptually like:

```ts
findUserByUsername(username)
```

or:

```ts
findUserByEmail(email)
```

The API route should not contain direct SQL/Drizzle lookup logic if that logic belongs in the Authentication repository.

---

## 4. Verify Password

### Goal

Verify that the submitted password matches the stored password hash.

### Required behavior

```text
Submitted password
        ↓
Password verification function
        ↓
Stored password hash
        ↓
Match / No match
```

### Security requirements

- never store plaintext passwords;
- never log submitted passwords;
- never send `password_hash` to the browser;
- password comparison must run on the server;
- use a secure password hashing algorithm supported by the project.

Suggested logical helpers:

```ts
hashPassword(password)
verifyPassword(password, passwordHash)
```

Password hashing should be isolated from API handlers so the implementation can be replaced later without rewriting the login route.

---

## 5. Active-Account Check

### Goal

Prevent disabled/inactive staff accounts from authenticating.

### Expected rule

```text
valid credentials
+
is_active = true
=
login allowed
```

If the account is inactive:

```text
valid password
+
is_active = false
=
login rejected
```

The client should receive a safe login failure response.

Do not expose unnecessary internal details such as:

```text
"Your account exists but was disabled by manager #4."
```

unless BrewHub intentionally introduces that behavior later.

---

## 6. Create Secure Session

### Goal

Create a trusted authenticated session after successful credential verification.

### Expected flow

```text
User authenticated
      ↓
Create session
      ↓
Set secure session cookie
      ↓
Browser sends cookie on future requests
      ↓
Server resolves current user
```

### Session requirements

The session cookie should use appropriate security settings.

Recommended production behavior:

```text
HttpOnly
Secure
SameSite
expiration
```

### Rules

- session secrets must never be exposed to application pages;
- session identifiers must not contain passwords;
- sessions must expire;
- logout must invalidate the session;
- protected server endpoints must validate the session;
- client-side state alone must never be trusted as proof of authentication.

---

## 7. Login

### Suggested endpoint

```text
POST /api/auth/login
```

### Logical request

```json
{
  "username": "cashier01",
  "password": "user-entered-password"
}
```

The actual identifier field must match BrewHub's user model.

### Login processing flow

```text
1. Receive request
2. Validate request body
3. Find user
4. Verify password
5. Check active-account status
6. Create secure session
7. Update last_login_at
8. Emit authentication telemetry
9. Return safe current-user information
```

### Successful response

Return only fields the client needs.

Example:

```json
{
  "data": {
    "id": 17,
    "username": "cashier01",
    "role": "CASHIER"
  }
}
```

### Invalid login

Use a generic client-facing message such as:

```text
Invalid credentials.
```

Avoid separate responses for:

```text
username does not exist
wrong password
```

This reduces account-enumeration risk.

---

## 8. Logout

### Suggested endpoint

```text
POST /api/auth/logout
```

### Expected behavior

```text
Current session
    ↓
Invalidate session
    ↓
Clear authentication cookie
    ↓
Return success
    ↓
Frontend redirects to /login
```

Logout is a state-changing operation.

---

## 9. Current User

### Suggested endpoint

```text
GET /api/auth/me
```

or an equivalent server-side current-user helper.

### Purpose

The application needs a trusted way to determine:

```text
Who is logged in?
What is their user ID?
What role do they have?
Is their account still active?
```

### Suggested server helpers

```ts
getCurrentUser(event)
requireUser(event)
```

Recommended behavior:

```text
getCurrentUser()

authenticated → user
anonymous     → null
```

```text
requireUser()

authenticated → user
anonymous     → throw 401
```

---

## 10. Protect Authenticated Pages

Authentication protection should cover staff pages that require login.

Possible protected areas include:

```text
orders
inventory
catalog management
reports
staff management
payment operations
```

Public pages may include:

```text
/login
```

Whether the public product catalog remains anonymous or becomes staff-only should follow the actual BrewHub product requirements.

### Nuxt frontend behavior

Client middleware may:

```text
check current user
    ↓
authenticated?
    ├── yes → continue
    └── no  → redirect to /login
```

Frontend middleware improves user experience.

It is not the security boundary.

---

## 11. Protect Authenticated API Endpoints

Every protected server endpoint must independently verify authentication.

Example:

```ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  // protected operation
})
```

Do not rely on:

```text
"The page is protected, therefore the API is protected."
```

A user can call APIs directly without using the page.

Therefore:

```text
Page protection
+
API protection
```

are both required.

---

## 12. Update `last_login_at`

### Goal

Record the timestamp of a successful staff login.

Suggested behavior:

```text
credentials valid
+
account active
+
session successfully created
        ↓
update last_login_at
```

Do not update `last_login_at` for:

```text
failed password attempts
inactive-account attempts
malformed login requests
```

### Domain ownership

The Authentication domain should perform this update through its own repository/service flow.

---

## 13. Phase 1 Suggested Structure

Adapt to the existing BrewHub project structure.

```text
server/
├── api/
│   └── auth/
│       ├── login.post.ts
│       ├── logout.post.ts
│       └── me.get.ts
│
├── domains/
│   └── authentication/
│       ├── repository.ts
│       ├── service.ts
│       ├── password.ts
│       ├── session.ts
│       ├── authorization.ts
│       └── types.ts
│
middleware/
└── auth.ts

pages/
└── login.vue
```

Do not create duplicate files when an equivalent abstraction already exists.

---

## 14. Phase 1 HTTP Behavior

### `400 Bad Request`

Use for malformed input.

Example:

```text
missing required login field
invalid request body shape
```

### `401 Unauthorized`

Use for authentication failure.

Examples:

```text
invalid credentials
missing session
expired session
invalid session
```

### `403 Forbidden`

Do not use this for ordinary login failure.

`403` belongs primarily to Phase 2 when:

```text
the user is authenticated
but lacks permission
```

### `500 Internal Server Error`

Use for unexpected internal failures.

Do not expose:

```text
database stack traces
password hashes
session internals
```

to the client.

---

## 15. Phase 1 Security Telemetry

The BrewHub architecture requires security telemetry.

Authentication should support events/metrics such as:

```text
login_success_total
login_failure_total
```

Useful structured context:

```text
timestamp
request_id
trace_id
user_id (when safely known)
operation
result
duration_ms
```

Never log:

```text
password
password_hash
session secret
```

---

## 16. Phase 1 Verification Checklist

### User lookup

- [x] user can be identified using the configured login identifier;
- [x] user lookup happens through the Authentication domain;
- [x] sensitive fields are not returned to the frontend.

### Password

- [x] password is verified using a secure password hash;
- [x] plaintext passwords are not stored;
- [x] password hashes are not returned through API responses.

### Account state

- [x] inactive accounts are rejected.

### Session

- [x] successful login creates a secure session;
- [x] current session resolves the authenticated user;
- [x] logout invalidates the session;
- [x] protected APIs verify the session server-side.

### Navigation

- [x] protected pages redirect anonymous users to login.

### Login metadata

- [x] successful login updates `last_login_at`.

---

# Phase 2 — Authorization

## Status

```text
Phase 2 — Authorization
⏳ roles
⏳ permissions
⏳ manager-only operations
```

Authorization is the next security layer after authentication.

Authentication already identifies the user.

Authorization will determine what that authenticated user is allowed to do.

---

## 17. Authorization Goal

Authorization answers:

> Is this authenticated staff member allowed to perform this operation?

Example:

```text
cashier logs in successfully
        ↓
user is authenticated
        ↓
cashier attempts manual inventory adjustment
        ↓
authorization check
        ↓
permission denied
        ↓
403 Forbidden
```

---

## 18. Roles

The exact BrewHub staff roles are a business decision.

The current architecture requirements do not define the final role list.

A practical initial proposal is:

```text
ADMIN
MANAGER
CASHIER
```

This should be confirmed before implementation.

### CASHIER

Possible capabilities:

```text
view catalog
search products
create orders
perform normal checkout
process permitted payments
view inventory availability
```

Possible restrictions:

```text
cannot manage staff
cannot assign roles
cannot perform protected stock adjustments
cannot change protected product prices
cannot access manager-only reports
```

### MANAGER

Possible capabilities:

```text
all normal cashier capabilities
catalog management
price changes
inventory adjustments
order cancellation
refund approval/processing
management reports
```

Exact permissions must follow BrewHub's agreed business rules.

### ADMIN

Possible capabilities:

```text
manager capabilities
staff account management
role assignment
account activation/deactivation
authorization administration
```

Whether BrewHub needs ADMIN immediately should be decided explicitly.

---

## 19. Role Storage

Before modifying the database, inspect the existing `users` table.

If each user only needs one role initially, a direct role column can be sufficient.

Example:

```text
users
├── id
├── username
├── password_hash
├── role
├── is_active
├── last_login_at
├── created_at
└── updated_at
```

Possible role values:

```text
CASHIER
MANAGER
ADMIN
```

### Future growth

If BrewHub later requires:

```text
multiple roles per user
custom role creation
branch-specific access
temporary permissions
complex permission assignment
```

then authorization may evolve toward:

```text
roles
permissions
role_permissions
user_roles
```

Do not introduce that complexity before it is required.

---

## 20. Permissions

Roles are broad staff classifications.

Permissions represent individual business capabilities.

Examples:

```text
catalog.read
catalog.manage
catalog.price.update

orders.create
orders.cancel

inventory.read
inventory.adjust

payments.process
payments.refund

reports.view

users.read
users.manage
users.role.update
```

### Why permissions matter

Avoid scattering code like:

```ts
if (user.role === 'MANAGER') {
  // operation
}
```

through every module.

Instead:

```ts
requirePermission(event, 'inventory.adjust')
```

This separates:

```text
role definition
from
business operation authorization
```

---

## 21. Proposed Permission Matrix

This is a starting proposal, not a final business requirement.

| Permission | CASHIER | MANAGER | ADMIN |
|---|:---:|:---:|:---:|
| `catalog.read` | ✅ | ✅ | ✅ |
| `catalog.manage` | ❌ | ✅ | ✅ |
| `catalog.price.update` | ❌ | ✅ | ✅ |
| `orders.create` | ✅ | ✅ | ✅ |
| `orders.cancel` | ❌ | ✅ | ✅ |
| `inventory.read` | ✅ | ✅ | ✅ |
| `inventory.adjust` | ❌ | ✅ | ✅ |
| `payments.process` | ✅ | ✅ | ✅ |
| `payments.refund` | ❌ | ✅ | ✅ |
| `reports.view` | ❌ | ✅ | ✅ |
| `users.read` | ❌ | ❌ | ✅ |
| `users.manage` | ❌ | ❌ | ✅ |
| `users.role.update` | ❌ | ❌ | ✅ |

Update this table when BrewHub's actual staff policy is finalized.

---

## 22. Authorization Helpers

Authorization checks should be centralized.

Suggested helpers:

```ts
hasPermission(user, permission)
requirePermission(event, permission)
requireRole(event, allowedRoles)
```

### `hasPermission`

Pure check:

```text
user + permission
        ↓
true / false
```

### `requirePermission`

Server enforcement:

```text
authenticated user
        ↓
has required permission?
        ├── yes → continue
        └── no  → 403 Forbidden
```

### `requireRole`

Useful for simple role-restricted areas.

Example:

```ts
requireRole(event, ['MANAGER', 'ADMIN'])
```

Prefer permissions for business operations because they describe intent more precisely.

---

## 23. Recommended Authorization Flow

Example: changing a product price.

```text
PATCH /api/catalog/products/:id/price
        ↓
requireUser(event)
        ↓
requirePermission(
  user,
  'catalog.price.update'
)
        ↓
Catalog service
        ↓
Catalog repository
        ↓
PostgreSQL
        ↓
Audit sensitive change
```

Important:

```text
Authorization decides whether the actor may request the operation.

Catalog still owns product pricing.
```

Authorization must not directly change Catalog tables.

---

## 24. Manager-Only Operations

The first authorization milestone should demonstrate at least one manager-only business operation.

Possible candidates:

### Catalog

```text
create product
update product
deactivate product
change product price
manage categories
```

### Ordering

```text
cancel restricted order
override allowed order state
```

### Inventory

```text
manual stock adjustment
record spoilage/waste
correct inventory discrepancy
```

### Payment

```text
refund payment
approve restricted refund
```

### Reporting

```text
view management report
view sales report
view inventory report
```

The exact first manager-only endpoint should be selected based on the next BrewHub domain being developed.

---

## 25. Frontend Authorization

The UI should use authorization information to improve user experience.

Example:

```text
CASHIER
→ do not show "Adjust Stock"

MANAGER
→ show "Adjust Stock"
```

Possible frontend helper:

```ts
can('inventory.adjust')
```

or:

```ts
hasPermission('inventory.adjust')
```

### Important rule

Frontend hiding is not security.

This is required:

```text
Frontend permission check
+
Server permission check
```

Even if a button is hidden, the API must reject unauthorized direct requests.

---

## 26. Route Authorization

There are three useful route categories.

### Public

Example:

```text
/login
```

### Authenticated

Any logged-in staff user may enter.

Example:

```text
/orders
```

depending on BrewHub's final UI design.

### Restricted

Only staff with the required permission may enter.

Examples:

```text
/reports
/admin/users
/inventory/adjustments
```

Possible navigation flow:

```text
not authenticated
→ redirect to /login

authenticated but unauthorized
→ show forbidden page / redirect safely

authenticated and authorized
→ continue
```

The corresponding API still needs independent authorization.

---

## 27. `401` vs `403`

This distinction should remain consistent.

### `401 Unauthorized`

Meaning:

```text
The request does not have a valid authenticated user.
```

Examples:

```text
no session
expired session
invalid session
```

### `403 Forbidden`

Meaning:

```text
The user is authenticated
but lacks the required permission.
```

Example:

```text
CASHIER
→ POST /api/inventory/adjust
→ 403 Forbidden
```

---

## 28. Authorization Telemetry

The BrewHub architecture expects:

```text
authorization_denied_total
```

Suggested structured denial log:

```json
{
  "level": "WARN",
  "operation": "authorization.denied",
  "user_id": 17,
  "role": "CASHIER",
  "permission": "inventory.adjust",
  "request_id": "req-8721",
  "trace_id": "1bf92ca"
}
```

Useful fields:

```text
timestamp
user_id
role
permission
domain
operation
request_id
trace_id
result
```

Do not include authentication secrets.

---

## 29. Authorization and Audit

Some authorized operations are sensitive enough to require an audit record.

Examples:

```text
user role changed
product price changed
order cancelled
inventory adjusted
payment refunded
staff account activated/deactivated
```

Audit records should consider:

```text
actor
action
resource
resource_id
before
after
timestamp
reason
```

Example:

```text
actor: user 4
action: user.role.update
resource: user
resource_id: 17
before: CASHIER
after: MANAGER
reason: shift manager promotion
```

Role changes must not happen silently because they change what a staff account can do throughout BrewHub.

---

## 30. Phase 2 Architecture Rules

### AUTHZ-001

Every protected server operation must resolve an authenticated user before authorization.

### AUTHZ-002

Sensitive operations must enforce authorization on the server.

### AUTHZ-003

Frontend visibility rules must never be the only authorization control.

### AUTHZ-004

Authorization checks must use reusable role/permission helpers.

### AUTHZ-005

Authenticated users without the required permission receive `403 Forbidden`.

### AUTHZ-006

Unauthenticated requests to protected resources receive `401 Unauthorized`.

### AUTHZ-007

Sensitive role changes must create an audit record.

### AUTHZ-008

Authorization denials must emit structured security telemetry.

### AUTHZ-009

Authorization must not bypass domain ownership.

Example:

```text
MANAGER has inventory.adjust
```

does not mean:

```text
Authentication module updates inventory directly.
```

The Inventory domain must still execute the adjustment.

### AUTHZ-010

Permissions should represent business capabilities.

Good:

```text
inventory.adjust
catalog.price.update
payments.refund
```

Avoid UI-specific permissions such as:

```text
showAdjustButton
showRefundModal
```

---

## 31. Phase 2 Suggested File Structure

Adapt this to existing BrewHub conventions.

```text
server/
└── domains/
    └── authentication/
        ├── repository.ts
        ├── service.ts
        ├── session.ts
        ├── authorization.ts
        ├── permissions.ts
        └── types.ts
```

Possible responsibilities:

### `types.ts`

```text
StaffRole
Permission
AuthenticatedUser
```

### `permissions.ts`

```text
permission definitions
role-to-permission mapping
```

### `authorization.ts`

```text
hasPermission()
requirePermission()
requireRole()
```

---

## 32. Possible TypeScript Foundation

Example only:

```ts
export type StaffRole =
  | 'CASHIER'
  | 'MANAGER'
  | 'ADMIN'
```

Permissions:

```ts
export type Permission =
  | 'catalog.read'
  | 'catalog.manage'
  | 'catalog.price.update'
  | 'orders.create'
  | 'orders.cancel'
  | 'inventory.read'
  | 'inventory.adjust'
  | 'payments.process'
  | 'payments.refund'
  | 'reports.view'
  | 'users.read'
  | 'users.manage'
  | 'users.role.update'
```

Role mapping:

```ts
export const rolePermissions: Record<
  StaffRole,
  Permission[]
> = {
  CASHIER: [
    'catalog.read',
    'orders.create',
    'inventory.read',
    'payments.process',
  ],

  MANAGER: [
    'catalog.read',
    'catalog.manage',
    'catalog.price.update',
    'orders.create',
    'orders.cancel',
    'inventory.read',
    'inventory.adjust',
    'payments.process',
    'payments.refund',
    'reports.view',
  ],

  ADMIN: [
    // Define explicit admin permissions
    // when the role model is finalized.
  ],
}
```

This is a design starting point. Do not treat it as the final authorization policy until BrewHub roles are confirmed.

---

## 33. Phase 2 Implementation Order

### Step 1 — Inspect current user schema

Confirm:

- [ ] current role field;
- [ ] current valid role values;
- [ ] whether a database migration is needed;
- [ ] whether role is already included in current-user/session data.

### Step 2 — Finalize initial roles

Decide:

- [ ] CASHIER;
- [ ] MANAGER;
- [ ] ADMIN, if needed.

### Step 3 — Define permission constants/types

Create one canonical permission list.

### Step 4 — Define role-to-permission mapping

Keep permission mapping centralized.

### Step 5 — Implement `hasPermission()`

Expected:

```text
user + permission
→ boolean
```

### Step 6 — Implement `requirePermission()`

Expected:

```text
allowed
→ continue

denied
→ throw 403
```

### Step 7 — Add optional `requireRole()`

Use for simple administrative route grouping if useful.

### Step 8 — Protect the first manager-only API

Recommended candidates:

```text
catalog.price.update
inventory.adjust
payments.refund
reports.view
```

Choose based on the next implemented domain.

### Step 9 — Add frontend permission checks

Use the current authenticated user to control:

```text
navigation
buttons
management actions
restricted pages
```

### Step 10 — Add authorization telemetry

At minimum:

```text
authorization_denied_total
```

### Step 11 — Add audit behavior

Start with the first sensitive manager operation.

### Step 12 — Test the role/permission matrix

Verify server behavior for every supported role.

---

## 34. Phase 2 Test Checklist

### CASHIER

- [ ] cashier can access permitted staff operations;
- [ ] cashier can perform allowed checkout operations;
- [ ] cashier cannot perform manager-only operations;
- [ ] direct restricted API requests return `403`.

### MANAGER

- [ ] manager can perform cashier operations;
- [ ] manager can access manager-approved operation;
- [ ] manager can access approved management reports.

### ADMIN

If implemented:

- [ ] admin can manage allowed staff functions;
- [ ] admin can update staff roles;
- [ ] role changes are audited.

### API security

- [ ] page-level restrictions cannot be bypassed by calling APIs directly;
- [ ] all sensitive APIs enforce server authorization;
- [ ] unauthenticated requests return `401`;
- [ ] authenticated-but-unauthorized requests return `403`.

### Telemetry

- [ ] authorization denials are logged/recorded;
- [ ] no password/hash/session secret appears in logs.

### Audit

- [ ] sensitive manager actions create required audit records;
- [ ] audit record contains actor and affected resource;
- [ ] before/after values are captured where appropriate.

---

# 35. Development Status Summary

## Phase 1 — Authentication

```text
[COMPLETE]

✓ identify user
✓ verify password
✓ active-account check
✓ create secure session
✓ login
✓ logout
✓ current user
✓ protect authenticated pages/API
✓ update last_login_at
```

## Phase 2 — Authorization

```text
[IN PROGRESS]

⏳ define roles
⏳ define permissions
⏳ implement manager-only operations
```

---

# 36. Definition of Done

## Phase 1

Phase 1 is complete when:

- [x] valid active staff can log in;
- [x] invalid credentials are rejected;
- [x] inactive accounts cannot authenticate;
- [x] secure authenticated sessions are created;
- [x] current user can be resolved;
- [x] logout invalidates the session;
- [x] authenticated pages are protected;
- [x] authenticated APIs are protected;
- [x] `last_login_at` is updated after successful login;
- [x] sensitive authentication fields are not exposed.

## Phase 2

Phase 2 will be complete when:

- [ ] initial BrewHub staff roles are documented and implemented;
- [ ] a canonical permission list exists;
- [ ] a role-to-permission mapping exists;
- [ ] server-side authorization helpers exist;
- [ ] protected business operations use permission checks;
- [ ] at least one manager-only operation is implemented;
- [ ] frontend UI respects authorization;
- [ ] restricted APIs cannot be bypassed directly;
- [ ] authorization denials generate security telemetry;
- [ ] sensitive manager operations generate audit records where required;
- [ ] `401` and `403` behavior is consistent.

---

# 37. Target Security Flow

```text
User
 │
 ▼
Login
 │
 ▼
Authentication
 │
 ├── identify user
 ├── verify password
 ├── active-account check
 └── create secure session
 │
 ▼
Current User
 │
 ▼
Authorization
 │
 ├── role
 ├── permissions
 └── operation check
 │
 ├────────────── denied ──────────────► 403 + telemetry
 │
 ▼ allowed
Domain API
 │
 ▼
Domain Service
 │
 ▼
Domain Repository
 │
 ▼
PostgreSQL
```

---

# 38. Important Project Decisions Still Open

The following should not be silently assumed:

- final BrewHub staff roles;
- exact permissions for each role;
- whether ADMIN is needed immediately;
- which actions require manager approval;
- whether staff can belong to multiple branches;
- whether roles differ by branch;
- session duration policy;
- MFA requirements;
- password policy;
- account lockout policy;
- who may issue refunds;
- which operations require a reason/audit note.

Record final decisions in project documentation as they are confirmed.

---

# 39. Maintenance Rule

Update this file whenever:

```text
a role is added or removed
a permission is added or renamed
a protected endpoint is introduced
manager-only behavior changes
session behavior changes
authorization telemetry changes
audit requirements change
```

This document should remain the reference for BrewHub's authentication and authorization development state.
