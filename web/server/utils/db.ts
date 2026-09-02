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