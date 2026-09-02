# BrewHub Cafe — Nuxt Runtime & Build Tools Configuration

This document records how the BrewHub Cafe Nuxt application was configured in VS Code, including the runtime, build tools, frontend tooling, backend TypeScript setup, database tooling, environment configuration, and the issues encountered during setup.

---

## 1. Project Structure

BrewHub uses one repository with the Nuxt application inside the `web/` directory.

```text
C:\Projects\brew_hub_cafe\
│
├── database\
├── docs\
├── .env                  # Docker/PostgreSQL environment
├── docker-compose.yml
│
└── web\
    ├── app\
    │   └── assets\
    │       └── css\
    │           └── main.css
    │
    ├── drizzle\
    │   ├── schema.ts
    │   ├── relations.ts
    │   └── meta\
    │
    ├── server\
    │   ├── api\
    │   ├── db\
    │   ├── domains\
    │   └── utils\
    │
    ├── .env              # Nuxt application environment
    ├── drizzle.config.ts
    ├── nuxt.config.ts
    ├── package.json
    └── tsconfig.json
```

The important separation is:

```text
app/       = frontend
server/    = Nitro backend
drizzle/   = generated database schema
```

---

## 2. Nuxt Runtime

The project was created using Nuxt 4.

Current runtime used during setup:

```text
Nuxt 4.5.2
Nitro 2.13.4
Vite 8.2.2
Vue 3.5.41
```

The Nuxt development server is started with:

```powershell
npm run dev
```

---

## 3. Dedicated Development Port

To prevent BrewHub from conflicting with another project using `localhost:3000`, BrewHub was assigned port `3100`.

In `nuxt.config.ts`:

```ts
devServer: {
  host: '127.0.0.1',
  port: 3100,
},
```

BrewHub is therefore opened at:

```text
http://127.0.0.1:3100
```

This is useful because different local applications should use different ports.

Example:

```text
ISMS       -> http://127.0.0.1:3000
BrewHub    -> http://127.0.0.1:3100
```

---

## 4. Installed Runtime Dependencies

The main application dependencies were installed with:

```powershell
npm install @pinia/nuxt nuxt-auth-utils nuxt-security drizzle-orm pg zod
```

Purpose of each package:

| Package | Purpose |
|---|---|
| `@pinia/nuxt` | Application/client state management |
| `nuxt-auth-utils` | Staff authentication and sessions |
| `nuxt-security` | Security-related headers and protections |
| `drizzle-orm` | Typed PostgreSQL ORM/query layer |
| `pg` | PostgreSQL Node.js driver |
| `zod` | Runtime request and payload validation |

---

## 5. Installed Development Dependencies

The development/build tools were installed with:

```powershell
npm install -D tailwindcss @tailwindcss/vite @nuxt/eslint eslint typescript drizzle-kit dotenv @types/pg vitest @nuxt/test-utils happy-dom
```

Additional packages installed later:

```powershell
npm install -D vue-tsc
npm install -D @types/node
```

Purpose:

| Package | Purpose |
|---|---|
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/vite` | Tailwind CSS 4 integration with Vite |
| `@nuxt/eslint` | Nuxt-aware ESLint configuration |
| `eslint` | Static code analysis |
| `typescript` | TypeScript compiler/tooling |
| `drizzle-kit` | Database introspection/migration CLI |
| `dotenv` | Loads `.env` variables in tooling such as Drizzle |
| `@types/pg` | Type definitions for PostgreSQL driver |
| `@types/node` | Node.js globals/types such as `process` |
| `vue-tsc` | Vue TypeScript checking |
| `vitest` | Unit/integration testing |
| `@nuxt/test-utils` | Nuxt testing helpers |
| `happy-dom` | DOM environment for tests |

---

## 6. Nuxt Configuration

The main configuration file is:

```text
web/nuxt.config.ts
```

Example configuration:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: {
    enabled: true,
  },

  devServer: {
    host: '127.0.0.1',
    port: 3100,
  },

  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    'nuxt-security',
  ],

  css: [
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    dbHost: '',
    dbPort: 5432,
    dbName: '',
    dbUser: '',
    dbPassword: '',
    dbSchema: 'brewhub',

    public: {
      appName: 'BrewHub Cafe',
    },
  },
})
```

---

## 7. Tailwind CSS 4 Configuration

Tailwind CSS 4 is integrated through Vite.

The stylesheet is located at:

```text
web/app/assets/css/main.css
```

Example:

```css
@import "tailwindcss";

@theme {
  --color-brew-50: #faf7f2;
  --color-brew-100: #f2eadf;
  --color-brew-500: #8b5e3c;
  --color-brew-700: #5f3d28;
  --color-brew-900: #342116;
}

@layer base {
  html {
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      sans-serif;
  }

  body {
    min-height: 100vh;
    background-color: var(--color-brew-50);
  }
}
```

The CSS file is loaded in `nuxt.config.ts`:

```ts
css: [
  '~/assets/css/main.css',
],
```

Tailwind is connected to Vite with:

```ts
vite: {
  plugins: [
    tailwindcss(),
  ],
},
```

---

## 8. VS Code Tailwind Support

VS Code originally reported:

```text
Unknown at rule @theme
```

This was an editor-language issue, not a Tailwind build error.

Recommended VS Code setting:

```json
{
  "files.associations": {
    "*.css": "tailwindcss"
  },

  "editor.quickSuggestions": {
    "strings": "on"
  }
}
```

The Tailwind CSS IntelliSense extension should also be installed.

---

## 9. TypeScript Configuration

Nuxt generates its own TypeScript project references inside `.nuxt`.

The generated files include:

```text
.nuxt/tsconfig.app.json
.nuxt/tsconfig.server.json
.nuxt/tsconfig.shared.json
.nuxt/tsconfig.node.json
.nuxt/tsconfig.json
```

To manually regenerate Nuxt types:

```powershell
npx nuxt prepare
```

This was required when `vue-tsc` reported:

```text
File '.nuxt/tsconfig.server.json' not found
```

After running:

```powershell
npx nuxt prepare
```

the missing configuration was generated successfully.

---

## 10. Node Type Definitions

`drizzle.config.ts` uses Node.js globals such as:

```ts
process.env
```

To provide Node.js type definitions:

```powershell
npm install -D @types/node
```

The Drizzle configuration can also explicitly declare Node types:

```ts
/// <reference types="node" />
```

Or use:

```ts
import { env } from 'node:process'
```

---

## 11. Environment Files

BrewHub uses two separate `.env` files.

### Root Docker `.env`

Location:

```text
C:\Projects\brew_hub_cafe\.env
```

Used by Docker Compose/PostgreSQL.

Example:

```env
POSTGRES_DB=brewhub_db
POSTGRES_USER=brewhub
POSTGRES_PASSWORD=YOUR_PASSWORD
POSTGRES_HOST_PORT=5441
TZ=Asia/Manila
```

### Nuxt `.env`

Location:

```text
C:\Projects\brew_hub_cafe\web\.env
```

Used by Nuxt/Nitro.

Example:

```env
NUXT_DB_HOST=127.0.0.1
NUXT_DB_PORT=5441
NUXT_DB_NAME=brewhub_db
NUXT_DB_USER=brewhub
NUXT_DB_PASSWORD=YOUR_REAL_POSTGRES_PASSWORD
NUXT_DB_SCHEMA=brewhub

NUXT_SESSION_PASSWORD=YOUR_LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS

NUXT_PUBLIC_APP_NAME=BrewHub Cafe
```

Database secrets must remain server-only.

Do not put database credentials under:

```ts
runtimeConfig.public
```

---

## 12. Nuxt Runtime Configuration

Environment variables are mapped into Nuxt with `runtimeConfig`.

```ts
runtimeConfig: {
  dbHost: '',
  dbPort: 5432,
  dbName: '',
  dbUser: '',
  dbPassword: '',
  dbSchema: 'brewhub',

  public: {
    appName: 'BrewHub Cafe',
  },
},
```

Example mapping:

```text
NUXT_DB_HOST
    ↓
runtimeConfig.dbHost
```

```text
NUXT_PUBLIC_APP_NAME
    ↓
runtimeConfig.public.appName
```

Private configuration is accessible only on the server.

---

## 13. PostgreSQL Runtime Connection

PostgreSQL runs in Docker while Nuxt currently runs directly on Windows.

Connection path:

```text
Nuxt
127.0.0.1:3100
      ↓
PostgreSQL
127.0.0.1:5441
      ↓
brewhub_db
      ↓
brewhub schema
```

The database helper is:

```text
server/utils/db.ts
```

Example:

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { useRuntimeConfig } from '#imports'

import * as schema from '../../drizzle/schema'

let pool: Pool | undefined

export function useDb() {
  const config = useRuntimeConfig()

  if (!config.dbHost) {
    throw new Error('NUXT_DB_HOST is not configured')
  }

  if (!config.dbName) {
    throw new Error('NUXT_DB_NAME is not configured')
  }

  if (!config.dbUser) {
    throw new Error('NUXT_DB_USER is not configured')
  }

  if (!config.dbPassword) {
    throw new Error('NUXT_DB_PASSWORD is not configured')
  }

  if (!pool) {
    pool = new Pool({
      host: config.dbHost,
      port: Number(config.dbPort),
      database: config.dbName,
      user: config.dbUser,
      password: config.dbPassword,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    })
  }

  return drizzle(pool, {
    schema,
  })
}
```

---

## 14. Database Health Endpoint

A read-only health endpoint was created at:

```text
server/api/health/db.get.ts
```

Example:

```ts
import { sql } from 'drizzle-orm'
import { useDb } from '#server/utils/db'

export default defineEventHandler(async () => {
  const db = useDb()

  const result = await db.execute(sql`
    SELECT
      current_database() AS database,
      current_user AS database_user,
      current_schema() AS current_schema,
      version() AS postgres_version
  `)

  return {
    status: 'ok',
    database: result.rows[0],
  }
})
```

It is available at:

```text
http://127.0.0.1:3100/api/health/db
```

Successful output confirmed:

```json
{
  "status": "ok",
  "database": {
    "database": "brewhub_db",
    "database_user": "brewhub",
    "current_schema": "brewhub"
  }
}
```

---

## 15. Drizzle Kit Configuration

Drizzle Kit is used to introspect the existing PostgreSQL schema.

File:

```text
web/drizzle.config.ts
```

Example:

```ts
/// <reference types="node" />

import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const host = process.env.NUXT_DB_HOST!
const port = process.env.NUXT_DB_PORT!
const database = process.env.NUXT_DB_NAME!
const user = encodeURIComponent(process.env.NUXT_DB_USER!)
const password = encodeURIComponent(process.env.NUXT_DB_PASSWORD!)

const databaseUrl =
  `postgresql://${user}:${password}@${host}:${port}/${database}`

export default defineConfig({
  dialect: 'postgresql',

  out: './drizzle',

  dbCredentials: {
    url: databaseUrl,
  },

  schemaFilter: [
    'brewhub',
  ],

  tablesFilter: [
    '*',
  ],

  introspect: {
    casing: 'camel',
  },

  verbose: true,
  strict: true,
})
```

---

## 16. Database Introspection

Because the BrewHub database already existed, the safe command used was:

```powershell
npx drizzle-kit pull
```

This performs:

```text
PostgreSQL schema
      ↓
Drizzle introspection
      ↓
Generated TypeScript schema
```

Generated files include:

```text
drizzle/
├── meta/
├── schema.ts
├── relations.ts
└── 0000_*.sql
```

At this stage, avoid running:

```powershell
npx drizzle-kit push
```

or:

```powershell
npx drizzle-kit migrate
```

unless a deliberate migration workflow has been established.

---

## 17. Generated Schema Naming

When Drizzle introspected the named PostgreSQL schema `brewhub`, it generated names similar to:

```ts
productsInBrewhub
categoriesInBrewhub
```

To keep application code clean, a bridge file was created:

```text
server/db/schema.ts
```

Example:

```ts
export {
  categoriesInBrewhub as categories,
  productsInBrewhub as products,
} from '../../drizzle/schema'
```

Application code can then import:

```ts
import {
  categories,
  products,
} from '#server/db/schema'
```

instead of using generated names directly.

---

## 18. Nuxt Server Architecture

BrewHub separates HTTP routes from business/domain code.

Recommended pattern:

```text
server/
├── api/
│   └── catalog/
│       ├── products.get.ts
│       └── categories.get.ts
│
├── domains/
│   └── catalog/
│       ├── repository.ts
│       └── service.ts
│
├── db/
│   └── schema.ts
│
└── utils/
    └── db.ts
```

Flow:

```text
API route
    ↓
Domain service
    ↓
Repository
    ↓
Drizzle
    ↓
PostgreSQL
```

---

## 19. Important Nuxt API Routing Rule

Every file placed under:

```text
server/api/
```

is treated as an API route.

For example:

```text
server/api/catalog/products.get.ts
```

maps to:

```text
GET /api/catalog/products
```

A route file must default-export an event handler:

```ts
export default defineEventHandler(() => {
  return {
    status: 'ok',
  }
})
```

Business modules such as:

```text
repository.ts
service.ts
```

must not be placed inside `server/api`.

They belong in:

```text
server/domains/
```

---

## 20. Catalog Runtime Example

The Catalog repository uses Drizzle for typed database access.

```ts
import { asc } from 'drizzle-orm'

import {
  categories,
  products,
} from '#server/db/schema'

import { useDb } from '#server/utils/db'

export async function findProducts(limit = 50) {
  const db = useDb()

  return db
    .select()
    .from(products)
    .orderBy(asc(products.id))
    .limit(limit)
}

export async function findCategories(limit = 50) {
  const db = useDb()

  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.id))
    .limit(limit)
}
```

The service layer:

```ts
import {
  findCategories,
  findProducts,
} from './repository'

function normalizeLimit(limit: number) {
  return Math.min(
    Math.max(limit, 1),
    100,
  )
}

export async function getProducts(limit = 50) {
  return findProducts(
    normalizeLimit(limit),
  )
}

export async function getCategories(limit = 50) {
  return findCategories(
    normalizeLimit(limit),
  )
}
```

---

## 21. Useful Development Commands

### Start Nuxt

```powershell
npm run dev
```

### Generate Nuxt types

```powershell
npx nuxt prepare
```

### Type-check

```powershell
npx nuxt typecheck
```

### Introspect PostgreSQL

```powershell
npx drizzle-kit pull
```

### Check Docker database

```powershell
docker compose ps
```

### Test PostgreSQL directly

```powershell
docker exec -it brewhub-db psql -U brewhub -d brewhub_db
```

### Test Nitro API

```powershell
Invoke-RestMethod http://127.0.0.1:3100/api/health/db
```

---

## 22. Recommended `package.json` Scripts

Recommended scripts:

```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "typecheck": "nuxt typecheck",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:pull": "drizzle-kit pull"
  }
}
```

---

## 23. Runtime vs Build Tool Summary

### Runtime

These components execute while BrewHub is running:

```text
Nuxt
Vue
Nitro
H3
Pinia
Drizzle ORM
pg
Zod
nuxt-auth-utils
nuxt-security
PostgreSQL
```

### Build / Development Tools

These support development, compilation, validation, testing, and schema generation:

```text
Vite
TypeScript
vue-tsc
Tailwind CSS
@tailwindcss/vite
ESLint
Drizzle Kit
Vitest
Nuxt Test Utils
dotenv
@types/node
@types/pg
```

---

## 24. Current Runtime Flow

```text
Browser
  ↓
http://127.0.0.1:3100
  ↓
Nuxt 4 / Vue frontend
  ↓
Nitro / H3 API
  ↓
Domain service
  ↓
Repository
  ↓
Drizzle ORM
  ↓
pg connection pool
  ↓
PostgreSQL 17
  ↓
brewhub_db
  ↓
brewhub schema
```

---

## 25. Current Setup Status

```text
Nuxt 4                 ✅
Vue 3                  ✅
Vite                   ✅
Tailwind CSS 4         ✅
TypeScript             ✅
vue-tsc                ✅
Pinia                  ✅
Nuxt Auth Utils        ✅
Nuxt Security          ✅
Drizzle ORM            ✅
Drizzle Kit            ✅
PostgreSQL driver      ✅
PostgreSQL connection  ✅
brewhub_db             ✅
brewhub schema         ✅
Catalog products API   ✅
Catalog categories API ✅
```

This setup provides the runtime and build-tool foundation for the remaining BrewHub domains such as Authentication, Customers, Ordering, Inventory, Payments, Reporting, Audit, and Observability.
