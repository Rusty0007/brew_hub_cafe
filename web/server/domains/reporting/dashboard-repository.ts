import { and, eq, sql, type SQL } from 'drizzle-orm'
import { orders, users } from '#server/db/schema'
import { useDb } from '#server/utils/db'

export interface DashboardOrderScope {
  branchId: number
  timezone: string
  days: number
  owner: { kind: 'branch' } | { kind: 'cashier', userId: number } | { kind: 'customer', customerId: number }
}

export function dashboardOrderCondition(scope: DashboardOrderScope) {
  const conditions: SQL[] = [eq(orders.branchId, scope.branchId)]
  if (scope.owner.kind === 'cashier') conditions.push(eq(orders.createdByUserId, scope.owner.userId))
  if (scope.owner.kind === 'customer') conditions.push(eq(orders.customerId, scope.owner.customerId))
  conditions.push(sql`${orders.createdAt} >= ((date_trunc('day', now() AT TIME ZONE ${scope.timezone}) - (${scope.days - 1} * interval '1 day')) AT TIME ZONE ${scope.timezone})`)
  conditions.push(sql`${orders.createdAt} <= now()`)
  return and(...conditions)
}

export async function findDashboardOrderStats(scope: DashboardOrderScope) {
  const db = useDb()
  const condition = dashboardOrderCondition(scope)
  const day = sql<string>`to_char(${orders.createdAt} AT TIME ZONE ${scope.timezone}, 'YYYY-MM-DD')`.as('activity_day')
  const [statuses, daily] = await Promise.all([
    db.select({
      status: orders.status,
      count: sql<number>`count(*)::integer`,
      amount: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
    }).from(orders).where(condition).groupBy(orders.status),
    // Refer to the selected expression once: repeating it would bind a new
    // timezone parameter and PostgreSQL would reject the GROUP BY expression.
    db.select({ day, count: sql<number>`count(*)::integer` }).from(orders).where(condition).groupBy(sql`"activity_day"`).orderBy(sql`"activity_day"`),
  ])
  return { statuses, daily }
}

export async function findDashboardAccountStats(timezone: string, days: number) {
  const db = useDb()
  const day = sql<string>`to_char(${users.createdAt} AT TIME ZONE ${timezone}, 'YYYY-MM-DD')`.as('activity_day')
  const since = sql`${users.createdAt} >= ((date_trunc('day', now() AT TIME ZONE ${timezone}) - (${days - 1} * interval '1 day')) AT TIME ZONE ${timezone})`
  const [statuses, daily] = await Promise.all([
    db.select({ active: users.isActive, count: sql<number>`count(*)::integer` }).from(users).groupBy(users.isActive),
    db.select({ day, count: sql<number>`count(*)::integer` }).from(users).where(and(since, sql`${users.createdAt} <= now()`)).groupBy(sql`"activity_day"`).orderBy(sql`"activity_day"`),
  ])
  return { statuses, daily }
}
