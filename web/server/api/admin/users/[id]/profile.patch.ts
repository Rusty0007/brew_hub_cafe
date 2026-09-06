import { requireRole } from '#server/domains/authentication/authorization'
import { staffProfileUpdateSchema, updateStaffProfile } from '#server/domains/authentication/staff-profile-service'
import { getBrewHubRequestContext } from '#server/utils/request-context'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const admin = await requireRole(event, 'ADMIN')
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(userId) || userId <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  const parsed = staffProfileUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Enter a valid name, email and change reason', data: parsed.error.flatten() })
  return { profile: await updateStaffProfile(userId, parsed.data, admin.id, getBrewHubRequestContext(event).traceId) }
})
