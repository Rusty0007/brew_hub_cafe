import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const mocks = vi.hoisted(() => ({ useDb: vi.fn(), requireRole: vi.fn(), requireAnyRole: vi.fn() }))
vi.mock('#server/utils/db', () => ({ useDb: mocks.useDb }))
vi.mock('#server/domains/authentication/authorization', () => ({ requireRole: mocks.requireRole, requireAnyRole: mocks.requireAnyRole }))
vi.mock('#server/utils/request-context', () => ({ getBrewHubRequestContext: () => ({ traceId: 'trace-profile' }) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('createError', (options: object) => Object.assign(new Error(), options))
vi.stubGlobal('setResponseHeader', vi.fn())
vi.stubGlobal('getRouterParam', (event: { id: string }) => event.id)
vi.stubGlobal('readBody', (event: { body: unknown }) => event.body)

const { staffProfileUpdateSchema, updateStaffProfile } = await import('../server/domains/authentication/staff-profile-service')
const { default: patch } = await import('../server/api/admin/users/[id]/profile.patch')
const { default: get } = await import('../server/api/staff/profile.get')
const input = { displayName: 'New name', email: 'staff@example.com', reason: 'Correct spelling', updatedAt: '2026-09-07 00:00:00+00' }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRole.mockResolvedValue({ id: 1 })
  mocks.requireAnyRole.mockResolvedValue({ id: 7 })
})

it.each(['roles', 'isActive', 'id', 'username', 'passwordHash', 'branchId'])('rejects the protected field %s', (field) => {
  expect(staffProfileUpdateSchema.safeParse({ ...input, [field]: 'changed' }).success).toBe(false)
})
it.each([{ ...input, reason: ' ' }, { ...input, displayName: '' }, { ...input, email: 'not-an-email' }])('validates correction data', (body) => {
  expect(staffProfileUpdateSchema.safeParse(body).success).toBe(false)
})
it('rejects edits before database access when admin authorization fails', async () => {
  mocks.requireRole.mockRejectedValue({ statusCode: 403 })
  await expect(patch({ id: '7', body: input } as unknown as H3Event)).rejects.toMatchObject({ statusCode: 403 })
  expect(mocks.useDb).not.toHaveBeenCalled()
})
it('requires staff authorization for self profiles', async () => {
  mocks.requireAnyRole.mockRejectedValue({ statusCode: 403 })
  const event = {} as H3Event
  await expect(get(event)).rejects.toMatchObject({ statusCode: 403 })
  expect(mocks.requireAnyRole).toHaveBeenCalledWith(event, ['MANAGER', 'CASHIER'])
  expect(mocks.useDb).not.toHaveBeenCalled()
})

function transactionFixture(code = 'CASHIER', updatedAt = input.updatedAt) {
  const before = { id: 7, displayName: 'Old name', email: 'old@example.com', updatedAt }
  const selections = [[before], [{ roleId: 2 }], [{ code }]]
  const set = vi.fn(() => ({ where: () => ({ returning: async () => [{ ...before, displayName: input.displayName, email: input.email }] }) }))
  const values = vi.fn().mockResolvedValue(undefined)
  const tx = {
    select: () => {
      const rows = selections.shift()
      const chain = { from: () => chain, where: () => chain, limit: () => chain, for: async () => rows, then: (resolve: (value: unknown) => void) => resolve(rows) }
      return chain
    },
    update: vi.fn(() => ({ set })),
    insert: vi.fn(() => ({ values })),
  }
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx))
  mocks.useDb.mockReturnValue({ transaction })
  return { tx, set, values, transaction }
}
it('writes only contact fields and inserts before/after audit data inside the transaction', async () => {
  const { set, values, transaction } = transactionFixture()
  await updateStaffProfile(7, input, 1, 'trace-profile')
  expect(transaction).toHaveBeenCalledOnce()
  expect(Object.keys(set.mock.calls[0]![0])).toEqual(['displayName', 'email', 'updatedAt'])
  expect(values).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, resourceId: '7', reason: input.reason, traceId: 'trace-profile', beforeData: { displayName: 'Old name', email: 'old@example.com' }, afterData: { displayName: input.displayName, email: input.email } }))
})
it('rejects stale profile versions without writing', async () => {
  const { tx } = transactionFixture('CASHIER', 'newer-version')
  await expect(updateStaffProfile(7, input, 1)).rejects.toMatchObject({ statusCode: 409 })
  expect(tx.update).not.toHaveBeenCalled()
})
it('rejects edits to admin profiles', async () => {
  const { tx } = transactionFixture('ADMIN')
  await expect(updateStaffProfile(7, input, 1)).rejects.toMatchObject({ statusCode: 403 })
  expect(tx.update).not.toHaveBeenCalled()
})
it('propagates audit failures out of the transaction rather than reporting success', async () => {
  const { values } = transactionFixture()
  values.mockRejectedValue(new Error('Audit unavailable'))
  await expect(updateStaffProfile(7, input, 1)).rejects.toThrow('Audit unavailable')
})
