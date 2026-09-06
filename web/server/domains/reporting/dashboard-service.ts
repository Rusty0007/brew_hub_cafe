import type { DashboardRole, DashboardSummary } from '#shared/types/dashboard'
import { findActiveReportingBranchByCode } from './repository'
import { findDashboardAccountStats, findDashboardOrderStats } from './dashboard-repository'

export function fillDashboardDays(rows: Array<{ day: string, count: number }>, days: number, timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)?.value
  const today = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`)
  const counts = new Map(rows.map(row => [row.day, Number(row.count)]))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - days + index + 1)
    const key = date.toISOString().slice(0, 10)
    return { label: key, value: counts.get(key) ?? 0 }
  })
}

export async function getDashboardSummary(role: DashboardRole, userId: number, days: number, customerId?: number): Promise<DashboardSummary> {
  const branch = await findActiveReportingBranchByCode('MAIN')
  if (!branch) throw createError({ statusCode: 503, statusMessage: 'BrewHub branch is unavailable' })
  const generatedAt = new Date().toISOString()
  const period = `Last ${days} calendar days · ${branch.timezone}`
  if (role === 'admin') {
    const { statuses, daily } = await findDashboardAccountStats(branch.timezone, days)
    const active = Number(statuses.find(row => row.active)?.count ?? 0)
    const inactive = Number(statuses.find(row => !row.active)?.count ?? 0)
    return {
      title: 'A clear view of your community', scope: `All BrewHub accounts · ${period}`, generatedAt,
      metrics: [
        { label: 'Total accounts', value: active + inactive, detail: 'Current customer and staff accounts' },
        { label: 'Active accounts', value: active, detail: 'Currently enabled accounts' },
        { label: 'Inactive accounts', value: inactive, detail: 'Currently disabled accounts' },
        { label: 'New accounts', value: daily.reduce((sum, row) => sum + Number(row.count), 0), detail: `Registered in the last ${days} days` },
      ],
      trend: { title: 'New account registrations', points: fillDashboardDays(daily, days, branch.timezone) },
      breakdown: { title: 'Account access', points: [{ label: 'Active', value: active }, { label: 'Inactive', value: inactive }] },
      note: 'Account totals and access status are current snapshots. The selected period applies to registrations only.',
    }
  }
  if (role === 'customer' && !customerId) throw createError({ statusCode: 403, statusMessage: 'Customer profile required' })
  const owner = role === 'customer'
    ? { kind: 'customer' as const, customerId: customerId! }
    : role === 'cashier' ? { kind: 'cashier' as const, userId } : { kind: 'branch' as const }
  const { statuses, daily } = await findDashboardOrderStats({ branchId: branch.id, timezone: branch.timezone, days, owner })
  const completed = statuses.find(row => row.status === 'COMPLETED')
  const total = statuses.reduce((sum, row) => sum + Number(row.count), 0)
  const pending = statuses.filter(row => ['DRAFT', 'PENDING_PAYMENT'].includes(row.status)).reduce((sum, row) => sum + Number(row.count), 0)
  return {
    title: role === 'customer' ? 'Your BrewHub moments' : role === 'cashier' ? 'Your counter at a glance' : 'The cafe at a glance',
    scope: `${role === 'customer' ? 'Your orders' : role === 'cashier' ? 'Orders created by you' : 'All branch orders'} · ${branch.name} · ${period}`,
    generatedAt,
    metrics: [
      { label: 'Orders placed', value: total, detail: `Created in the last ${days} days` },
      { label: 'Completed orders', value: Number(completed?.count ?? 0), detail: 'Currently marked completed' },
      { label: role === 'customer' ? 'Completed-order spending' : 'Completed-order sales', value: Number(completed?.amount ?? 0), money: true, detail: 'Order totals; not net of partial refunds' },
      { label: 'Awaiting checkout', value: pending, detail: 'Draft or pending payment in this period' },
    ],
    trend: { title: 'Orders placed each day', points: fillDashboardDays(daily, days, branch.timezone) },
    breakdown: { title: 'Order status', points: statuses.map(row => ({ label: row.status.replaceAll('_', ' ').toLowerCase(), value: Number(row.count) })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)) },
    note: 'The period selects orders by creation date, including today. Status and completed-order totals reflect their current state. Sales are not a payment-settlement or net-revenue report.',
  }
}
