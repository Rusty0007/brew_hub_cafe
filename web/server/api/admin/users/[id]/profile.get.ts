import { requireRole } from '#server/domains/authentication/authorization'
import { getStaffProfile } from '#server/domains/authentication/staff-profile-service'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  await requireRole(event, 'ADMIN')
  const userId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(userId) || userId <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  return { profile: await getStaffProfile(userId) }
})
