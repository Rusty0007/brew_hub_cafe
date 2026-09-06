import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ branch: vi.fn(), orders: vi.fn(), accounts: vi.fn() }))
vi.mock('../server/domains/reporting/repository', () => ({ findActiveReportingBranchByCode: mocks.branch }))
vi.mock('../server/domains/reporting/dashboard-repository', () => ({ findDashboardOrderStats: mocks.orders, findDashboardAccountStats: mocks.accounts }))
vi.stubGlobal('createError', (options: object) => Object.assign(new Error(), options))
const { fillDashboardDays, getDashboardSummary } = await import('../server/domains/reporting/dashboard-service')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.branch.mockResolvedValue({ id: 3, name: 'Main Cafe', timezone: 'Asia/Manila' })
  mocks.orders.mockResolvedValue({ statuses: [], daily: [] })
})

it('fills missing dates and handles the local day across UTC midnight/month boundaries', () => {
  const result = fillDashboardDays([{ day: '2026-09-01', count: 5 }], 3, 'Asia/Manila', new Date('2026-08-31T18:00:00Z'))
  expect(result).toEqual([
    { label: '2026-08-30', value: 0 },
    { label: '2026-08-31', value: 0 },
    { label: '2026-09-01', value: 5 },
  ])
})

it('counts all scoped orders but only sums currently completed order amounts', async () => {
  mocks.orders.mockResolvedValue({ daily: [], statuses: [
    { status: 'COMPLETED', count: 2, amount: '350.50' },
    { status: 'CANCELLED', count: 1, amount: '900.00' },
    { status: 'PENDING_PAYMENT', count: 3, amount: '450.00' },
    { status: 'DRAFT', count: 1, amount: '100.00' },
  ] })
  const result = await getDashboardSummary('cashier', 12, 7)
  expect(result.metrics.map(metric => metric.value)).toEqual([7, 2, 350.5, 4])
  expect(mocks.orders).toHaveBeenCalledWith({ branchId: 3, timezone: 'Asia/Manila', days: 7, owner: { kind: 'cashier', userId: 12 } })
})

it('returns honest zero values and zero-filled charts for a customer with no orders', async () => {
  const result = await getDashboardSummary('customer', 42, 30, 91)
  expect(result.metrics.every(metric => metric.value === 0)).toBe(true)
  expect(result.trend.points).toHaveLength(30)
  expect(result.breakdown.points).toEqual([])
  expect(mocks.orders).toHaveBeenCalledWith(expect.objectContaining({ owner: { kind: 'customer', customerId: 91 } }))
})

it('uses current account totals independently of the registration period', async () => {
  mocks.accounts.mockResolvedValue({ statuses: [{ active: true, count: 9 }, { active: false, count: 2 }], daily: [{ day: '2026-09-07', count: 3 }] })
  const result = await getDashboardSummary('admin', 1, 7)
  expect(result.metrics.map(metric => metric.value)).toEqual([11, 9, 2, 3])
  expect(mocks.orders).not.toHaveBeenCalled()
})

it('fails clearly when the configured branch is unavailable', async () => {
  mocks.branch.mockResolvedValue(null)
  await expect(getDashboardSummary('manager', 1, 7)).rejects.toMatchObject({ statusCode: 503 })
  expect(mocks.orders).not.toHaveBeenCalled()
})
