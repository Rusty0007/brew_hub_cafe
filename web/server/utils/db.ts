import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { useRuntimeConfig } from '#imports'

import * as schema from '../../drizzle/schema'

let pool: Pool | undefined

let dbQueryCount = 0
const SLOW_DB_QUERY_THRESHOLD_MS =
  500

let slowQueryTotal = 0
let dbQueryDurationCount = 0
let dbQueryDurationTotalMs = 0
let dbQueryDurationMinMs: number | null = null
let dbQueryDurationMaxMs = 0

let dbConnectionWaitCount = 0
let dbConnectionWaitTotalMs = 0
let dbConnectionWaitMinMs: number | null = null
let dbConnectionWaitMaxMs = 0

export function getDbConnectionWaitStats() {
  const averageMs =
    dbConnectionWaitCount > 0
      ? dbConnectionWaitTotalMs
        / dbConnectionWaitCount
      : 0

  return {
    averageMs,

    minMs:
      dbConnectionWaitMinMs
      ?? 0,

    maxMs:
      dbConnectionWaitMaxMs,
  }
}

function recordDbConnectionWait(
  durationMs: number,
) {
  dbConnectionWaitCount += 1

  dbConnectionWaitTotalMs +=
    durationMs

  dbConnectionWaitMinMs =
    dbConnectionWaitMinMs === null
      ? durationMs
      : Math.min(
          dbConnectionWaitMinMs,
          durationMs,
        )

  dbConnectionWaitMaxMs =
    Math.max(
      dbConnectionWaitMaxMs,
      durationMs,
    )
}


export function getDbQueryCount() {
  return dbQueryCount
}

export function getSlowQueryTotal() {
  return slowQueryTotal
}

export function getDbQueryDurationStats() {
  const averageMs =
    dbQueryDurationCount > 0
      ? dbQueryDurationTotalMs
        / dbQueryDurationCount
      : 0

  return {
    averageMs,
    minMs:
      dbQueryDurationMinMs
      ?? 0,
    maxMs:
      dbQueryDurationMaxMs,
  }
}

export function getDbConnectionStats() {
  if (!pool) {
    return {
      total: 0,
      idle: 0,
      waiting: 0,
    }
  }

  return {
    total:
      pool.totalCount,

    idle:
      pool.idleCount,

    waiting:
      pool.waitingCount,
  }
}

function recordDbQueryDuration(
  durationMs: number,
) {
  dbQueryDurationCount += 1

  dbQueryDurationTotalMs +=
    durationMs

  dbQueryDurationMinMs =
    dbQueryDurationMinMs === null
      ? durationMs
      : Math.min(
          dbQueryDurationMinMs,
          durationMs,
        )

  dbQueryDurationMaxMs =
    Math.max(
      dbQueryDurationMaxMs,
      durationMs,
    )
}

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
    const createdPool =
      new Pool({
        host: config.dbHost,
        port: Number(config.dbPort),
        database: config.dbName,
        user: config.dbUser,
        password: config.dbPassword,
        max: 10,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 30_000,
      })

    const originalConnect =
      createdPool.connect.bind(
        createdPool,
      )

    createdPool.connect = ((
      callback?: unknown,
    ) => {
      const startedAtMs =
        Date.now()

      if (
        typeof callback
        === 'function'
      ) {
        const connectCallback =
          callback as (
            error: unknown,
            client: unknown,
            done: unknown,
          ) => void

        return originalConnect(
          (
            error,
            client,
            done,
          ) => {
            const durationMs =
              Date.now()
              - startedAtMs

            recordDbConnectionWait(
              durationMs,
            )

            connectCallback(
              error,
              client,
              done,
            )
          },
        )
      }

      return originalConnect()
        .finally(
          () => {
            const durationMs =
              Date.now()
              - startedAtMs

            recordDbConnectionWait(
              durationMs,
            )
          },
        )
    }) as Pool['connect']

    const originalQuery =
      createdPool.query.bind(
        createdPool,
      )

    createdPool.query = (
      (...args: Parameters<
        Pool['query']
      >) => {
        dbQueryCount += 1
      
        const startedAtMs =
          Date.now()
      
        const queryResult =
          originalQuery(
            ...args,
          ) as unknown as Promise<unknown>
        
        return queryResult.finally(
        () => {
          const durationMs =
            Date.now()
            - startedAtMs
        
          recordDbQueryDuration(
            durationMs,
          )
        
          if (
            durationMs
            >= SLOW_DB_QUERY_THRESHOLD_MS
          ) {
            slowQueryTotal += 1
          }
        },
      )
      }
    ) as Pool['query']

    pool =
      createdPool
  }

  return drizzle(pool, {
    schema,
  })
}