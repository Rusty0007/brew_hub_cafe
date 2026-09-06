import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const mocks = vi.hoisted(() => ({
  requireAnyRole: vi.fn(), requireUser: vi.fn(), findCustomerByUserId: vi.fn(), getDashboardSummary: vi.fn(),
}))
vi.mock('#server/domains/authentication/authorization', () => ({ requireAnyRole: mocks.requireAnyRole }))
vi.mock('#server/domains/authentication/session', () => ({ requireUser: mocks.requireUser }))
vi.mock('#server/domains/customer/repository', () => ({ findCustomerByUserId: mocks.findCustomerByUserId }))
vi.mock('#server/domains/reporting/dashboard-service', () => ({ getDashboardSummary: mocks.getDashboardSummary }))
vi.mock('#server/utils/db', () => ({ useDb: vi.fn() }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('createError', (options: object) => Object.assign(new Error(), options))
vi.stubGlobal('setResponseHeader', vi.fn())
vi.stubGlobal('getRouterParam', (event: { role: string }) => event.role)
vi.stubGlobal('getQuery', (event: { query: object }) => event.query)

const { default: handler } = await import('../server/api/dashboard/[role].get')
const { dashboardOrderCondition } = await import('../server/domains/reporting/dashboard-repository')
const { PgDialect } = await import('drizzle-orm/pg-core')
const event = (role: string, query: object = {}) => ({ role, query }) as unknown as H3Event

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAnyRole.mockResolvedValue({ id: 12, roles: ['CASHIER'] })
  mocks.requireUser.mockResolvedValue({ id: 42, roles: [] })
  mocks.findCustomerByUserId.mockResolvedValue({ id: 91, isActive: true })
  mocks.getDashboardSummary.mockResolvedValue({ title: 'Dashboard' })
})

describe('dashboard access', () => {
  it.each([['admin', 'ADMIN'], ['manager', 'MANAGER'], ['cashier', 'CASHIER']])('requires the %s role on the server', async (role, required) => {
    const request = event(role)
    await handler(request)
    expect(mocks.requireAnyRole).toHaveBeenCalledWith(request, [required])
  })
  it('never queries dashboard data when staff authorization fails', async () => {
    mocks.requireAnyRole.mockRejectedValue({ statusCode: 403 })
    await expect(handler(event('manager'))).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getDashboardSummary).not.toHaveBeenCalled()
  })
  it('rejects an unauthenticated customer', async () => {
    mocks.requireUser.mockRejectedValue({ statusCode: 401 })
    await expect(handler(event('customer'))).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.findCustomerByUserId).not.toHaveBeenCalled()
  })
  it('derives customer ownership from the session, ignoring supplied IDs', async () => {
    await handler(event('customer', { days: '30', userId: '999', customerId: '999', branchId: '999' }))
    expect(mocks.findCustomerByUserId).toHaveBeenCalledWith(42)
    expect(mocks.getDashboardSummary).toHaveBeenCalledWith('customer', 42, 30, 91)
  })
  it.each([null, { id: 91, isActive: false }])('rejects missing/inactive customer profiles', async (profile) => {
    mocks.findCustomerByUserId.mockResolvedValue(profile)
    await expect(handler(event('customer'))).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getDashboardSummary).not.toHaveBeenCalled()
  })
  it('rejects staff access to customer statistics', async () => {
    mocks.requireUser.mockResolvedValue({ id: 12, roles: ['ADMIN'] })
    await expect(handler(event('customer'))).rejects.toMatchObject({ statusCode: 403 })
  })
  it.each(['0', '365', '7 OR 1=1', ['7', '30']])('rejects invalid periods', async (days) => {
    await expect(handler(event('cashier', { days }))).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.getDashboardSummary).not.toHaveBeenCalled()
  })
  it('rejects unknown dashboard routes', async () => {
    await expect(handler(event('superadmin'))).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('database scope predicates', () => {
  it.each([
    [{ kind: 'cashier' as const, userId: 12 }, 'created_by_user_id', 12],
    [{ kind: 'customer' as const, customerId: 91 }, 'customer_id', 91],
  ])('binds ownership and branch in SQL', (owner, column, id) => {
    const condition = dashboardOrderCondition({ branchId: 3, timezone: 'Asia/Manila', days: 7, owner })!
    const query = new PgDialect().sqlToQuery(condition)
    expect(query.sql).toContain(`"${column}" =`)
    expect(query.sql).toContain('"branch_id" =')
    expect(query.params.slice(0, 2)).toEqual([3, id])
    expect(query.sql).toContain('AT TIME ZONE')
    expect(query.sql).toContain('<= now()')
  })
})
