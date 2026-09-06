import { requireAnyRole } from '#server/domains/authentication/authorization'
import { getStaffProfile } from '#server/domains/authentication/staff-profile-service'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const user = await requireAnyRole(event, ['MANAGER', 'CASHIER'])
  return { profile: await getStaffProfile(user.id) }
})
