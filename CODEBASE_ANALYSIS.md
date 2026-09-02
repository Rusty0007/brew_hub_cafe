# BrewHub Cafe System - Complete Codebase Analysis

## Project Overview
**BrewHub Cafe** is a full-stack Nuxt 3 + PostgreSQL cafe management system with role-based access control (RBAC). It manages products, orders, inventory, payments, and provides separate workspaces for customers, cashiers, managers, and admins.

---

## 1. ROOT LEVEL FILES

### `docker-compose.yml`
**Purpose**: Database infrastructure setup
- Orchestrates PostgreSQL database container
- Defines database connectivity for local development
- Parent of: Database initialization and seed files

### `package.json`
**Purpose**: Node.js project metadata and dependencies
- Declares scripts, dependencies, and project configuration
- Parent of: All npm packages used in the project

---

## 2. DATABASE LAYER (`/database`)

### `/database/init/`
**Purpose**: Database initialization scripts
- Runs once on first database startup
- Creates database schema and structure
- Parent of: All table definitions and constraints

### `/database/changes/`
**Purpose**: Versioned schema migrations
- **001_add_customer_user_account.sql**: Adds customer table and user relationships
- **002_add_orders_context.sql**: Implements order and payment tables
- Child of: Database initialization
- Ensures schema changes are tracked and reversible

### `/database/seeds/`
**Purpose**: Initial data population
- **001_catalog_seed.sql**: Populates products and categories
- **002_auth_roles_seed.sql**: Creates authentication roles (ADMIN, MANAGER, CASHIER, CUSTOMER)
- **003_admin_role_seed.sql**: Creates initial admin user account
- Child of: Database initialization
- Provides reference data for development/testing

---

## 3. CONFIGURATION & DOCUMENTATION (`/docs`)

### Core Documentation Files
- **README.md**: Project overview and getting started guide
- **REQUIREMENTS.md**: Business and technical requirements
- **ARCHITECTURE.md**: Domain-driven design patterns and ownership
- **DATABASE_NOTES.md**: Database design decisions
- **Development_Sequence.md**: Step-by-step setup instructions
- **2ND_PHASE_AUTHENTICATION.md**: Advanced auth features
- **ASSESSMENT_CHECKLIST.md**: Project completion criteria
- **OPEN_QUESTIONS.md**: Design decisions pending
- **BrewHub-Cafe-System-Structure.md**: System component overview
- **BrewHub_Nuxt_Runtime_Build_Tools_Setup.md**: Development environment setup

---

## 4. FRONTEND APPLICATION (`/web`)

### Core Configuration Files

#### `nuxt.config.ts`
**Purpose**: Main Nuxt 3 framework configuration
- Configures modules: Pinia (state), Auth Utils, ESLint, Security, Tailwind
- Sets development server port (3100)
- Defines runtime config for database connection
- Session/cookie security settings
- Parent of: All Nuxt features and middleware

#### `tsconfig.json`
**Purpose**: TypeScript compiler configuration
- Strict type checking enabled
- Path aliases and compilation settings
- Child of: All .ts and .vue files

#### `drizzle.config.ts`
**Purpose**: ORM configuration for database access
- Connects to PostgreSQL via Drizzle
- Manages database migrations
- Parent of: Database schema usage

#### `eslint.config.mjs`
**Purpose**: Code linting and style rules
- Ensures code quality and consistency
- Child of: All source files (enforced)

#### `package.json`
**Purpose**: Frontend project dependencies and scripts
- npm scripts for dev, build, test
- Lists all dependencies

---

### Application Root (`/app`)

#### `app.vue`
**Purpose**: Main application shell
- Provides NuxtLayout wrapper for all pages
- NuxtPage renders current route
- Parent of: All pages and layouts
- Child of: nuxt.config.ts

#### `/app/layouts/`
**Layout: `default.vue`**
- Wraps all pages with consistent navigation and layout
- Parent of: All page components

---

### Middleware (`/app/middleware/`)

**Role**: Request validation and route protection - executed before page render

#### `auth.ts`
**Purpose**: Global authentication middleware
- Verifies user session via `/api/auth/me`
- Redirects unauthenticated users to login
- On error: Throws exception
- Child of: All routes (auto-applied)
- Parent of: Role-specific middleware

#### `cashier.ts`
**Purpose**: Cashier role-specific middleware
- Checks if user has CASHIER role
- Redirects managers to /staff/manager if accessing /staff/cashier
- Guards POS operations
- Child of: auth.ts, /staff/cashier route
- Parent of: Cashier workspace features

#### `customer.ts`
**Purpose**: Customer workspace protection
- Restricts access to customer account features
- Child of: /account route

#### `admin.ts`
**Purpose**: Admin-only workspace protection
- Restricts access to admin panel
- Child of: /admin route

#### `manager.ts`
**Purpose**: Manager workspace protection
- Restricts access to manager features
- Child of: /staff/manager route

#### `guest.ts`
**Purpose**: Guest-only route protection
- Prevents logged-in users from accessing guest pages
- Protects login/register pages
- Child of: /login, /register routes

**Server-Side Middleware (`/server/middleware/`)**

#### `request-context.ts`
**Purpose**: Request tracking and context propagation
- Generates unique `requestId` and `traceId` for each request
- Sets response headers for request tracking
- Initializes request context (userId, branchId, orderId)
- Logs request details for observability
- Parent of: All API endpoints
- Uses: Observability domain

---

### Composables (`/app/composables/`)

**Role**: Reusable Vue 3 Composition API logic

#### `useAccountAccess.ts`
**Purpose**: Role-based access control helper
- Exposes computed properties: `isAdmin`, `isManager`, `isCashier`, `isCustomer`, `isStaff`
- Provides `workspaceDestination` computed property for routing
- Parent of: All components checking user roles
- Child of: useUserSession (from nuxt-auth-utils)

#### `useCheckoutTrace.ts`
**Purpose**: Checkout flow state management
- Tracks customer through checkout process
- Manages checkout steps and validation
- Parent of: Cart and checkout pages
- Child of: Cart store

#### `useProtectedLeaveWarning.ts`
**Purpose**: Form protection on navigation
- Prevents accidental data loss
- Shows warning when leaving unsaved forms
- Parent of: All forms
- Uses: Vue Router

---

### State Management (`/app/stores/`)

#### `cart.ts` (Pinia Store)
**Purpose**: Shopping cart state
- Manages cart items (productId, sku, name, unitPrice, quantity)
- Computed properties: `totalItems`, `subtotal`, `tax`, `total`
- Actions: `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`
- Persists to localStorage via cart-persistance plugin
- Child of: All product/cart components
- Parent of: Checkout flow

---

### Components (`/app/components/`)

#### Catalog Components (`/components/catalog/`)

**`ProductCard.vue`**
- **Purpose**: Display individual product in catalog
- Maps SKU to product images
- Shows product name, description, price
- Features quick-view modal and add-to-cart button
- Child of: catalog.vue page
- Parent of: ProductQuickViewModal
- Uses: cart store, ProductQuickViewModal

**`ProductQuickViewModal.vue`**
- **Purpose**: Lightbox-style product detail preview
- Allows customers to preview product before adding to cart
- Child of: ProductCard.vue
- Parent of: Cart operations

**`CategoryFilter.vue`**
- **Purpose**: Filter products by category
- Displays category list
- Triggers product filtering
- Child of: catalog.vue page
- Uses: Catalog API

---

### Plugins (`/app/plugins/`)

#### `cart-persistance.client.ts`
**Purpose**: Client-side cart persistence
- Persists cart store to localStorage
- Restores cart on page reload
- Child of: app initialization
- Parent of: cart.ts store

---

### Pages (`/app/pages/`)

**Role**: Route endpoints matching file structure (Nuxt auto-routing)

#### Public Pages

**`index.vue`** (/)
- Landing/home page
- Shows featured products and welcome content
- No authentication required
- Child of: default layout

**`login.vue`** (/login)
- User authentication form
- Submits to `/api/auth/login`
- Redirects to workspace based on role
- Protected by: guest.ts middleware
- Child of: default layout

**`register.vue`** (/register)
- User registration form
- Creates new customer account
- Protected by: guest.ts middleware
- Child of: default layout

#### Authenticated Pages

**`catalog.vue`** (/catalog)
- Product listing and browsing
- Uses: CategoryFilter, ProductCard components
- Protected by: auth.ts middleware
- Child of: default layout

**`cart.vue`** (/cart)
- Shopping cart review
- Shows items, quantities, totals
- Checkout initiation
- Protected by: auth.ts middleware
- Child of: default layout

#### Account (`/pages/account/`)

**`index.vue`** (/account)
- Customer profile and account settings
- Protected by: auth.ts, customer.ts middleware
- Child of: default layout

**`orders/`** (/account/orders)
- Customer order history
- Shows past orders and status
- Protected by: auth.ts, customer.ts middleware

#### Admin Workspace (`/pages/admin/`)

**`index.vue`** (/admin)
- Admin dashboard
- Protected by: auth.ts, admin.ts middleware

**`observability/`** (/admin/observability)
- System monitoring and logging
- Request tracing, audit logs
- Child of: admin workspace

**`users/`** (/admin/users)
- User management interface
- Create/update/deactivate users
- Child of: admin workspace

#### Staff Workspace (`/pages/staff/`)

**`index.vue`** (/staff)
- Staff home/dashboard
- Navigation to different workspaces

**`cashier/`** (/staff/cashier)
- POS (Point of Sale) checkout
- Protected by: cashier.ts middleware
- Child of: staff workspace

**`inventory.vue`** (/staff/inventory)
- Inventory management
- Stock levels and movements
- Child of: staff workspace

**`pos/`** (/staff/pos)
- Shared POS interface
- Accessible to both cashiers and managers
- Child of: staff workspace

**`catalog/`** (/staff/catalog)
- Staff product management
- Add/edit products and categories
- Child of: staff workspace

**`manager/`** (/staff/manager)
- Manager dashboard
- Protected by: manager.ts middleware
- Analytics and reporting
- Child of: staff workspace

**`orders/`** (/staff/orders)
- Order management interface
- View and update order status
- Child of: staff workspace

**`users/`** (/staff/users)
- Staff user management
- Child of: staff workspace

---

## 5. SERVER-SIDE LAYER (`/server`)

### Database Connection (`/server/utils/db.ts`)

**Purpose**: PostgreSQL pool initialization via Drizzle ORM
- Validates runtime config (host, port, database, user, password)
- Creates connection pool
- Exports useDb() for all endpoints
- Parent of: All API endpoints and domain repositories
- Child of: nuxt.config.ts runtime config

### Database Schema (`/server/db/schema.ts`)

**Purpose**: Re-exports Drizzle schema
- Imports from `/web/drizzle/schema.ts`
- Makes schema available to server code
- Parent of: All database queries
- Child of: Drizzle schema definition

---

### API Routes (`/server/api/`)

**Role**: RESTful endpoints following Nuxt H3 conventions

#### Health Check
**`ping.get.ts`**
- GET /api/ping
- Simple health check endpoint
- No authentication

#### Authentication (`/api/auth/`)

**`login.post.ts`**
- POST /api/auth/login
- Validates credentials against users table
- Creates session and sets cookie
- Returns: user data and roles
- Child of: login.vue page

**`logout.post.ts`**
- POST /api/auth/logout
- Clears session
- Redirects to login

**`manager-check.get.ts`**
- GET /api/auth/manager-check
- Checks if user has MANAGER role
- Returns: boolean

**Me Endpoint** (from nuxt-auth-utils)
- GET /api/auth/me
- Returns current user session data
- Used by: auth middleware

#### Catalog (`/api/catalog/`)
- GET endpoints for products and categories
- Used by: ProductCard, CategoryFilter components
- Depends on: Catalog domain

#### Customer (`/api/customer/`)
- CRUD operations for customer profiles
- GET, PUT endpoints
- Used by: Account pages
- Depends on: Customer domain

#### Ordering (`/api/pos/`, `/api/ordering/`)
- POST to create orders
- GET to retrieve order history
- Depends on: Ordering domain, Payment domain

#### Staff Operations (`/api/staff/`, `/api/manager/`)
- Staff-specific endpoints
- Inventory updates, order management
- Protected by: Role checking

#### Admin (`/api/admin/`)
- User management endpoints
- System configuration
- Protected by: admin.ts check

#### Observability (`/api/observability/`)
- Logging and monitoring endpoints
- Request tracing
- Audit log retrieval

#### Development (`/api/dev/`)
- Development-only utilities
- Seed data, test endpoints

---

### Domain Layer (`/server/domains/`)

**Role**: Business logic organization by domain (Domain-Driven Design)

#### Authentication (`/domains/authentication/`)
- User authentication logic
- Password hashing/verification
- Session management
- Owns: users, roles, user_roles tables
- Must not: Modify orders, payments, inventory directly

#### Catalog (`/domains/catalog/`)
- Product and category management
- Pricing logic
- Owns: categories, products tables
- Must not: Modify orders, inventory directly

#### Customer (`/domains/customer/`)
- Customer record management
- Customer lookup and profile updates
- Owns: customers table
- Must not: Modify payments, inventory directly

#### Inventory (`/domains/inventory/`)
- Stock level tracking
- Inventory reservations
- Stock movement recording
- Owns: inventory, inventory_reservations, stock_movements tables
- Manages: Product availability and warehouse operations

#### Ordering (`/domains/ordering/`)
- Order creation and management
- Order item association
- Status tracking
- Owns: orders, order_items tables
- Consumes: Products (read), Inventory (reserve), Payments

#### Payment (`/domains/payment/`)
- Payment processing and tracking
- Transaction recording
- Owns: payments table
- Consumed by: Ordering domain

#### Reporting (`/domains/reporting/`)
- Sales reports and analytics
- Daily/monthly summaries
- Consumed by: Manager dashboard

#### Observability (`/domains/observability/`)
- Request logging and tracing
- Audit log recording
- Performance monitoring
- Owns: audit_logs table (implied)
- Consumed by: All domains for logging

#### Idempotency (`/domains/idempotency/`)
- Ensures duplicate requests don't create duplicate data
- Tracks request IDs and responses
- Used by: Payment, Ordering domains

---

### Utilities (`/server/utils/`)

**`db.ts`**
- Database pool and connection management
- Used by: All repositories
- Parent of: All data access

**`logger.ts`**
- Structured logging utilities
- logInfo(), logError(), logWarn()
- Used by: All domains for logging

**`request-context.ts`**
- Stores and retrieves request context
- userId, branchId, orderId, requestId, traceId
- Used by: All API handlers and middleware

---

### Tasks (`/server/tasks/`)

**`ordering/`**
- Background tasks for order processing
- Order fulfillment automation
- Timeout handling
- Scheduled/event-driven execution

---

## 6. DRIZZLE ORM LAYER (`/web/drizzle/`)

### `schema.ts`
**Purpose**: Core database schema definition
- Defines all tables in PostgreSQL "brewhub" schema
- Establishes relationships and constraints

**Tables**:

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | Staff/customer accounts | Referenced by: roles, customers |
| `roles` | Authorization roles | Has many: user_roles |
| `user_roles` | User-role mapping | Links users ↔ roles |
| `branches` | Cafe locations | Referenced by: inventory |
| `categories` | Product categories | Parent of: products |
| `products` | Menu items/inventory SKUs | Parent of: order_items, inventory |
| `customers` | Customer profiles | Links to users |
| `orders` | Customer orders | Parent of: order_items, payments |
| `order_items` | Items in orders | Links orders ↔ products |
| `payments` | Payment transactions | Links to orders |
| `inventory` | Stock levels | Links products ↔ branches |
| `inventory_reservations` | Reserved stock | Links to orders, inventory |
| `stock_movements` | Inventory audit trail | Tracks changes |
| `audit_logs` | System audit trail | Tracks all changes |

### Migrations
**Purpose**: Version-controlled schema changes
- `0000_flashy_amazoness.sql`: Initial schema snapshot
- Manages schema evolution

### `relations.ts`
**Purpose**: Drizzle relationships configuration
- Defines table relations for querying
- Used by: Repository queries for eager loading

---

## 7. ASSETS (`/public/`)

### Images
- **`landing/`**: Landing page hero images
- **`products/`**: Product photos with SKU-based naming (e.g., 'COF-AMER-001' → americano.png)

### Meta
- **`robots.txt`**: Search engine crawling rules

---

## 8. TYPES (`/shared/types/`)

### `auth.d.ts`
**Purpose**: TypeScript type definitions for authentication
- CurrentUser interface
- Session types
- Role enums
- Used by: All auth-related code

---

## 9. STYLES (`/app/assets/`)

### CSS
**`main.css`**
- Global styles
- Tailwind CSS imports
- Custom utility classes
- Child of: nuxt.config.ts (imported)

---

## KEY ARCHITECTURAL RELATIONSHIPS

### Request Flow (Authentication → Order Placement)

```
1. User visits /login (guest.ts allows it)
2. Submits credentials → POST /api/auth/login
3. Server validates against users table
4. Session created, cookie set
5. Redirected to workspace (based on role)
   
   - Admin → /admin
   - Manager → /staff/manager
   - Cashier → /staff/cashier
   - Customer → /catalog
   
6. Auth middleware validates all requests via /api/auth/me
7. Request context middleware adds tracing
8. Role-specific middleware enforces access
```

### Order Creation Flow

```
1. Customer adds products via ProductCard → cart store
2. Cart persisted to localStorage
3. Checkout form → POST /api/ordering/create
4. Request context middleware: adds userId, sets traceId
5. Ordering domain:
   - Creates order in orders table
   - Creates order_items from cart
   - Calls Inventory domain to reserve stock
   - Calls Payment domain to process
   - Logs via Observability domain
6. Response sent, cart cleared
```

### Data Ownership

```
Authentication owns: users, roles, user_roles
Catalog owns: categories, products
Customer owns: customers
Inventory owns: inventory, inventory_reservations, stock_movements
Ordering owns: orders, order_items
Payment owns: payments
Observability owns: audit_logs
```

---

## FILE HIERARCHY SUMMARY

```
PROJECT ROOT
├── docker-compose.yml (infrastructure)
├── CODEBASE_ANALYSIS.md (this file)
│
├── database/ (schema + data)
│   ├── init/ (schema creation)
│   ├── changes/ (migrations)
│   └── seeds/ (initial data)
│
├── docs/ (documentation)
│
└── web/ (Nuxt application)
    ├── nuxt.config.ts (framework config) ──┐
    ├── package.json (dependencies)          │
    ├── tsconfig.json (TS config)            │
    ├── drizzle.config.ts (ORM config)       │
    ├── eslint.config.mjs (linting)          │
    │                                        │
    ├── app/                                  ├─ Root Configuration
    │   ├── app.vue (main shell)              │
    │   ├── middleware/ (route guards)        │
    │   ├── layouts/default.vue               │
    │   ├── pages/ (routes)                   │
    │   ├── components/ (UI parts)            │
    │   ├── composables/ (logic reuse)        │
    │   ├── stores/cart.ts (state)            │
    │   ├── plugins/cart-persistance.ts       │
    │   ├── assets/css/main.css               │
    │   └── shared/types/auth.d.ts            │
    │                                        │
    ├── server/ (backend)                    ├─ Server Layer
    │   ├── middleware/request-context.ts    │
    │   ├── utils/                           │
    │   │   ├── db.ts (connection)           │
    │   │   ├── logger.ts                    │
    │   │   └── request-context.ts           │
    │   ├── api/ (HTTP endpoints)            │
    │   │   ├── auth/                        │
    │   │   ├── catalog/                     │
    │   │   ├── ordering/                    │
    │   │   ├── payment/                     │
    │   │   └── ... (more routes)            │
    │   ├── domains/ (business logic)        │
    │   │   ├── authentication/              │
    │   │   ├── catalog/                     │
    │   │   ├── inventory/                   │
    │   │   ├── ordering/                    │
    │   │   └── ... (more domains)           │
    │   └── tasks/ (background jobs)         │
    │                                        │
    ├── drizzle/ (ORM & schema)              ├─ Data Layer
    │   ├── schema.ts (table definitions)    │
    │   ├── relations.ts (relationships)     │
    │   └── migrations/                      │
    │                                        │
    ├── public/ (assets)                     └─ Static Assets
    │   ├── robots.txt
    │   └── images/
    │       ├── landing/
    │       └── products/
    │
    └── README.md
```

---

## IMPLEMENTATION JUSTIFICATION

### Why These Layers?

1. **Database Layer** (docker-compose, migrations, seeds)
   - Ensures reproducible database state
   - Tracks schema changes
   - Separates infrastructure from code

2. **Configuration Layer** (nuxt.config, drizzle.config, tsconfig)
   - Centralizes tool configuration
   - Environment-aware settings
   - Type safety across build tooling

3. **Frontend Layer** (pages, components, composables)
   - Nuxt auto-routing reduces boilerplate
   - Middleware protects routes before render
   - Composables share logic between components
   - Stores centralize state

4. **Server Layer** (API routes, domains, utilities)
   - API routes map HTTP verbs to handlers
   - Domains organize by business context (not by CRUD)
   - Utilities provide shared functions
   - Middleware adds cross-cutting concerns (logging, tracing)

5. **Data Layer** (Drizzle schema, relations)
   - Type-safe ORM prevents SQL errors
   - Schema reflects business entities
   - Relations enable efficient queries

6. **Asset Layer** (public images, CSS)
   - Static files served directly
   - Images organized by feature (landing, products)

---

## WHEN TO USE EACH FILE/FOLDER

| Need | Use This | Reason |
|------|----------|--------|
| Show a product | ProductCard.vue | Reusable component |
| Track shopping cart | cart.ts (Pinia store) | Persistent shared state |
| Protect a route | middleware/*.ts | Auto-applied route guards |
| Add a role check | useAccountAccess.ts | Composable logic reuse |
| Create an API endpoint | server/api/*.ts | Auto-routes on file path |
| Add business logic | server/domains/*.ts | Domain-driven organization |
| Add a page | app/pages/*.vue | Auto-routes via filename |
| Define database table | web/drizzle/schema.ts | Single source of truth |
| Store session data | server/utils/request-context.ts | Request-scoped context |
| Add site-wide styling | app/assets/css/main.css | Global CSS |
| Add a composable | app/composables/*.ts | Shared Vue 3 logic |
| Handle migration | database/changes/NNN*.sql | Version-controlled schema |

