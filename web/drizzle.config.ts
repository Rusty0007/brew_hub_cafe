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