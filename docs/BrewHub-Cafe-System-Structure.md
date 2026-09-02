# BrewHub-Cafe System Structure

```text
web/
├── app/
│   ├── assets/
│   │   └── css/
│   │       └── main.css
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── catalog/
│   │   ├── ordering/
│   │   └── inventory/
│   │
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   ├── stores/
│   └── types/
│
├── server/
│   ├── api/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── catalog/
│   │   ├── orders/
│   │   ├── inventory/
│   │   ├── payments/
│   │   ├── reports/
│   │   └── health/
│   │
│   ├── domains/
│   │   ├── authentication/
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   └── schemas.ts
│   │   │
│   │   ├── customer/
│   │   ├── catalog/
│   │   ├── ordering/
│   │   ├── inventory/
│   │   ├── payment/
│   │   └── reporting/
│   │
│   ├── db/
│   │   ├── schema.ts
│   │   └── relations.ts
│   │
│   ├── middleware/
│   ├── plugins/
│   └── utils/
│
├── shared/
│   ├── types/
│   └── contracts/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env
├── .env.example
├── drizzle.config.ts
├── eslint.config.mjs
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

## Purpose

This structure is intended for the **BrewHub-Cafe** system using Nuxt with a clear separation between the frontend application, server-side API, business domains, database layer, shared contracts, and tests.
