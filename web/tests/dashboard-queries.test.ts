import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from 'dotenv'

const mocks = vi.hoisted(() => ({ useDb: vi.fn() }))
vi.mock('#server/utils/db', () => ({ useDb: mocks.useDb }))
const { findDashboardOrderStats, findDashboardAccountStats } = await import('../server/domains/reporting/dashboard-repository')

const query = vi.fn().mockResolvedValue({ rows: [] })
beforeEach(() => {
  query.mockClear()
  mocks.useDb.mockReturnValue(drizzle({ query } as unknown as Pool))
})

it.each(['orders', 'accounts'])('groups the %s daily query by its selected alias without rebinding the timezone', async (kind) => {
  if (kind === 'orders') {
    await findDashboardOrderStats({ branchId: 1, timezone: 'Asia/Manila', days: 7, owner: { kind: 'cashier', userId: 7 } })
  }
  else {
    await findDashboardAccountStats('Asia/Manila', 7)
  }
  const call = query.mock.calls.find(([statement]) => statement.text.includes('to_char'))
  expect(call).toBeDefined()
  const text = call![0].text as string
  expect(text).toContain('as "activity_day"')
  expect(text).toContain('group by "activity_day" order by "activity_day"')
  expect(text.match(/to_char/g)).toHaveLength(1)
})

// Opt-in, read-only PostgreSQL regression: execute the actual repository queries
// against the developer's configured database without printing records or secrets.
let pool: Pool | undefined
afterAll(async () => { await pool?.end() })
it.skipIf(process.env.DASHBOARD_DB_CHECK !== '1')('executes every dashboard scope and period on PostgreSQL', async () => {
  config({ quiet: true })
  pool = new Pool({
    host: process.env.NUXT_DB_HOST,
    port: Number(process.env.NUXT_DB_PORT ?? 5432),
    database: process.env.NUXT_DB_NAME,
    user: process.env.NUXT_DB_USER,
    password: process.env.NUXT_DB_PASSWORD,
    connectionTimeoutMillis: 5000,
    options: '-c default_transaction_read_only=on -c statement_timeout=10000',
  })
  mocks.useDb.mockReturnValue(drizzle(pool))
  for (const days of [7, 30]) {
    for (const owner of [{ kind: 'branch' as const }, { kind: 'cashier' as const, userId: 7 }, { kind: 'customer' as const, customerId: 1 }]) {
      const result = await findDashboardOrderStats({ branchId: 1, timezone: 'Asia/Manila', days, owner })
      expect(Array.isArray(result.daily)).toBe(true)
      for (const row of result.daily) {
        expect(row.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(Number(row.count)).toBeGreaterThanOrEqual(0)
      }
    }
    const accounts = await findDashboardAccountStats('Asia/Manila', days)
    expect(Array.isArray(accounts.daily)).toBe(true)
  }
}, 30000)
